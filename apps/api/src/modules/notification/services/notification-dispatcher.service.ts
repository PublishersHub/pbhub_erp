import { Injectable, Logger } from '@nestjs/common';
import { NotificationChannel, NotificationStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationTemplatesService } from './notification-templates.service';
import { NotificationPreferencesService } from './notification-preferences.service';
import { MailerService } from '../../../common/mail/mail.service';
import {
  DEFAULT_TEMPLATES,
  NotificationEventPayload,
} from '../events/event-types';

@Injectable()
export class NotificationDispatcherService {
  private readonly logger = new Logger(NotificationDispatcherService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly templatesService: NotificationTemplatesService,
    private readonly preferencesService: NotificationPreferencesService,
    private readonly mailerService: MailerService,
  ) {}

  /**
   * Main entry point for event listeners. Resolves recipients, template,
   * preferences, and creates Notification + DeliveryLog rows. Never throws —
   * all errors are logged but swallowed so parent workflows are not affected.
   */
  async dispatch(
    eventType: string,
    payload: NotificationEventPayload,
  ): Promise<void> {
    try {
      const recipientUserIds = await this.resolveRecipients(payload);
      if (recipientUserIds.length === 0) {
        this.logger.debug(`No recipients for event ${eventType}`);
        return;
      }

      // Resolve template (org → system default → hardcoded fallback)
      const template = await this.templatesService.resolveTemplate(
        payload.organizationId,
        eventType,
        NotificationChannel.IN_APP,
      );

      const fallback = DEFAULT_TEMPLATES[eventType] ?? {
        subject: 'Notification',
        body: 'You have a new notification.',
      };

      const rawSubject = template?.subject ?? fallback.subject;
      const rawBody = template?.body ?? fallback.body;

      const title = this.interpolate(rawSubject, payload.variables);
      const body = this.interpolate(rawBody, payload.variables);

      // Filter self-notifications and deactivated users
      const filteredRecipients = await this.filterRecipients(
        recipientUserIds,
        payload.actorUserId ?? null,
      );

      if (filteredRecipients.length === 0) {
        this.logger.debug(`All recipients filtered for event ${eventType}`);
        return;
      }

      // Check per-user preferences for IN_APP — single batched query
      const preferences = await this.prisma.notificationPreference.findMany({
        where: {
          userId: { in: filteredRecipients },
          eventType,
          channel: NotificationChannel.IN_APP,
        },
        select: { userId: true, enabled: true },
      });

      const prefMap = new Map(
        preferences.map((p) => [p.userId, p.enabled]),
      );

      // Default = enabled unless explicitly disabled
      const deliverable = filteredRecipients.filter(
        (userId) => prefMap.get(userId) !== false,
      );

      // Batch-insert IN_APP notifications (skip if no one wants IN_APP)
      if (deliverable.length > 0) {
        const now = new Date();
        const notificationRows = deliverable.map((userId) => ({
          organizationId: payload.organizationId,
          recipientUserId: userId,
          eventType,
          title,
          body,
          referenceId: payload.referenceId ?? null,
          referenceType: payload.referenceType ?? null,
        }));

        await this.prisma.notification.createMany({
          data: notificationRows,
        });

        // Fetch the created notifications to get their IDs for delivery logs
        // (createMany doesn't return ids; use createdAt window to fetch)
        const created = await this.prisma.notification.findMany({
          where: {
            organizationId: payload.organizationId,
            eventType,
            recipientUserId: { in: deliverable },
            createdAt: { gte: now },
          },
          select: { id: true },
        });

        if (created.length > 0) {
          await this.prisma.notificationDeliveryLog.createMany({
            data: created.map((n) => ({
              notificationId: n.id,
              channel: NotificationChannel.IN_APP,
              status: NotificationStatus.SENT,
              deliveredAt: new Date(),
            })),
          });
        }

        this.logger.log(
          `Dispatched ${deliverable.length} IN_APP notification(s) for event ${eventType}`,
        );
      } else {
        this.logger.debug(
          `No deliverable IN_APP recipients after preference check for ${eventType}`,
        );
      }

      // ── EMAIL channel fan-out ──────────────────────────────────────────
      // EMAIL is opt-in: only send if the user has explicitly enabled it.
      const emailPrefs = await this.prisma.notificationPreference.findMany({
        where: {
          userId: { in: filteredRecipients },
          eventType,
          channel: NotificationChannel.EMAIL,
          enabled: true,
        },
        select: { userId: true },
      });

      const emailRecipientIds = new Set(emailPrefs.map((p) => p.userId));

      if (emailRecipientIds.size > 0) {
        const users = await this.prisma.user.findMany({
          where: { id: { in: [...emailRecipientIds] } },
          include: {
            account: { select: { email: true, firstName: true, lastName: true } },
          },
        });

        // Try EMAIL-specific template; fall back to the already-resolved IN_APP text
        const emailTemplate = await this.templatesService.resolveTemplate(
          payload.organizationId,
          eventType,
          NotificationChannel.EMAIL,
        );

        const emailSubject = this.interpolate(
          emailTemplate?.subject ?? rawSubject,
          payload.variables,
        );
        const emailBody = this.interpolate(
          emailTemplate?.body ?? rawBody,
          payload.variables,
        );

        for (const u of users) {
          if (!u.account?.email) continue;
          await this.mailerService.send({
            to: u.account.email,
            subject: emailSubject,
            body: emailBody,
          });
        }

        this.logger.log(
          `Sent ${users.length} EMAIL notification(s) for event ${eventType}`,
        );
      }
      // ─────────────────────────────────────────────────────────────────────
    } catch (error) {
      // Never fail parent workflow
      this.logger.error(
        `Failed to dispatch notification for event ${eventType}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * Resolve recipient userIds from payload.
   * Priority: recipientUserIds → recipientEmployeeIds (mapped to userIds).
   * Employees without a linked user are skipped silently.
   */
  private async resolveRecipients(
    payload: NotificationEventPayload,
  ): Promise<string[]> {
    const userIds = new Set<string>();

    if (payload.recipientUserIds?.length) {
      for (const id of payload.recipientUserIds) userIds.add(id);
    }

    if (payload.recipientEmployeeIds?.length) {
      const employees = await this.prisma.employee.findMany({
        where: {
          id: { in: payload.recipientEmployeeIds },
          organizationId: payload.organizationId,
          isActive: true,
        },
        select: { id: true, userId: true },
      });

      for (const emp of employees) {
        if (emp.userId) {
          userIds.add(emp.userId);
        } else {
          this.logger.warn(
            `Skipping notification: employee ${emp.id} has no linked user account`,
          );
        }
      }
    }

    return Array.from(userIds);
  }

  /**
   * Remove the actor (self-notification) and deactivated users.
   */
  private async filterRecipients(
    userIds: string[],
    actorUserId: string | null,
  ): Promise<string[]> {
    const filtered = actorUserId
      ? userIds.filter((id) => id !== actorUserId)
      : userIds;

    if (filtered.length === 0) return [];

    const activeUsers = await this.prisma.user.findMany({
      where: { id: { in: filtered }, isActive: true },
      select: { id: true },
    });

    return activeUsers.map((u) => u.id);
  }

  /**
   * Simple {{variable}} interpolation. Missing variables → empty string.
   */
  private interpolate(
    template: string,
    variables?: Record<string, string | number | null | undefined>,
  ): string {
    if (!variables) return template;
    return template.replace(/\{\{(\w+)\}\}/g, (_match, key) => {
      const value = variables[key];
      if (value === null || value === undefined) return '';
      return String(value);
    });
  }
}
