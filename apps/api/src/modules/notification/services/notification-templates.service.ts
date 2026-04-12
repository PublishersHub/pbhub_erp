import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, NotificationChannel } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateNotificationTemplateDto } from '../dto/create-notification-template.dto';
import { UpdateNotificationTemplateDto } from '../dto/update-notification-template.dto';

@Injectable()
export class NotificationTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: string, dto: CreateNotificationTemplateDto) {
    const channel = dto.channel ?? NotificationChannel.IN_APP;

    // Check for duplicate at application level (partial index will also enforce)
    const existing = await this.prisma.notificationTemplate.findFirst({
      where: { organizationId, eventType: dto.eventType, channel },
    });
    if (existing) {
      throw new BadRequestException(
        `A template already exists for event "${dto.eventType}" on channel ${channel}`,
      );
    }

    try {
      return await this.prisma.notificationTemplate.create({
        data: {
          organizationId,
          eventType: dto.eventType,
          channel,
          subject: dto.subject,
          body: dto.body,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException(
          `A template already exists for event "${dto.eventType}" on channel ${channel}`,
        );
      }
      throw error;
    }
  }

  async findAll(organizationId: string) {
    return this.prisma.notificationTemplate.findMany({
      where: { organizationId },
      orderBy: [{ eventType: 'asc' }, { channel: 'asc' }],
    });
  }

  async findById(organizationId: string, templateId: string) {
    const template = await this.prisma.notificationTemplate.findFirst({
      where: { id: templateId, organizationId },
    });
    if (!template) throw new NotFoundException('Notification template not found');
    return template;
  }

  async update(
    organizationId: string,
    templateId: string,
    dto: UpdateNotificationTemplateDto,
  ) {
    // Validate ownership first
    await this.findById(organizationId, templateId);

    await this.prisma.notificationTemplate.updateMany({
      where: { id: templateId, organizationId },
      data: {
        ...(dto.subject !== undefined && { subject: dto.subject }),
        ...(dto.body !== undefined && { body: dto.body }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    return this.findById(organizationId, templateId);
  }

  /**
   * Resolves a template by event + channel. Org-specific takes precedence,
   * then system default (organizationId = null). Returns null if neither exists.
   */
  async resolveTemplate(
    organizationId: string,
    eventType: string,
    channel: NotificationChannel,
  ) {
    const orgTemplate = await this.prisma.notificationTemplate.findFirst({
      where: { organizationId, eventType, channel, isActive: true },
    });
    if (orgTemplate) return orgTemplate;

    return this.prisma.notificationTemplate.findFirst({
      where: { organizationId: null, eventType, channel, isActive: true },
    });
  }
}
