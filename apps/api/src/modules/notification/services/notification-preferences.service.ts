import { Injectable } from '@nestjs/common';
import { NotificationChannel } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { UpdateNotificationPreferenceDto } from '../dto/update-notification-preference.dto';

@Injectable()
export class NotificationPreferencesService {
  constructor(private readonly prisma: PrismaService) {}

  async findMine(userId: string) {
    return this.prisma.notificationPreference.findMany({
      where: { userId },
      orderBy: [{ eventType: 'asc' }, { channel: 'asc' }],
    });
  }

  async updateMine(userId: string, dto: UpdateNotificationPreferenceDto) {
    for (const pref of dto.preferences) {
      await this.prisma.notificationPreference.upsert({
        where: {
          userId_eventType_channel: {
            userId,
            eventType: pref.eventType,
            channel: pref.channel,
          },
        },
        update: { enabled: pref.enabled },
        create: {
          userId,
          eventType: pref.eventType,
          channel: pref.channel,
          enabled: pref.enabled,
        },
      });
    }

    return this.findMine(userId);
  }

  /**
   * Returns true if delivery is allowed for the given (userId, eventType, channel).
   * Default is enabled when no explicit preference exists.
   */
  async isEnabled(
    userId: string,
    eventType: string,
    channel: NotificationChannel,
  ): Promise<boolean> {
    const pref = await this.prisma.notificationPreference.findUnique({
      where: {
        userId_eventType_channel: { userId, eventType, channel },
      },
    });
    if (!pref) return true; // default: enabled
    return pref.enabled;
  }
}
