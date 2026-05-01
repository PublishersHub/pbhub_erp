import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findMine(
    userId: string,
    organizationId: string,
    filters: { unread?: boolean; archived?: boolean },
  ) {
    return this.prisma.notification.findMany({
      where: {
        recipientUserId: userId,
        organizationId,
        ...(filters.unread === true && { isRead: false }),
        ...(filters.archived === true
          ? { isArchived: true }
          : { isArchived: false }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findMineById(
    userId: string,
    organizationId: string,
    notificationId: string,
  ) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        recipientUserId: userId,
        organizationId,
      },
    });
    if (!notification) throw new NotFoundException('Notification not found');
    return notification;
  }

  async getUnreadCount(userId: string, organizationId: string) {
    const count = await this.prisma.notification.count({
      where: {
        recipientUserId: userId,
        organizationId,
        isRead: false,
        isArchived: false,
      },
    });
    return { count };
  }

  async markRead(
    userId: string,
    organizationId: string,
    notificationId: string,
  ) {
    // Validate ownership via scoped findFirst
    await this.findMineById(userId, organizationId, notificationId);

    await this.prisma.notification.updateMany({
      where: {
        id: notificationId,
        recipientUserId: userId,
        organizationId,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return this.findMineById(userId, organizationId, notificationId);
  }

  async markAllRead(userId: string, organizationId: string) {
    const now = new Date();
    const result = await this.prisma.notification.updateMany({
      where: {
        recipientUserId: userId,
        organizationId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: now,
      },
    });
    return { updated: result.count };
  }

  async archive(
    userId: string,
    organizationId: string,
    notificationId: string,
  ) {
    await this.findMineById(userId, organizationId, notificationId);

    await this.prisma.notification.updateMany({
      where: {
        id: notificationId,
        recipientUserId: userId,
        organizationId,
      },
      data: {
        isArchived: true,
        archivedAt: new Date(),
      },
    });

    return this.findMineById(userId, organizationId, notificationId);
  }

  async findAll(organizationId: string) {
    return this.prisma.notification.findMany({
      where: { organizationId },
      include: {
        recipientUser: {
          select: {
            id: true,
            account: { select: { email: true, firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }
}
