import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsController } from './controllers/notifications.controller';
import { NotificationTemplatesController } from './controllers/notification-templates.controller';
import { NotificationsService } from './services/notifications.service';
import { NotificationTemplatesService } from './services/notification-templates.service';
import { NotificationPreferencesService } from './services/notification-preferences.service';
import { NotificationDispatcherService } from './services/notification-dispatcher.service';
import { NotificationEventListenerService } from './events/notification-event-listener.service';

@Module({
  imports: [PrismaModule],
  controllers: [NotificationsController, NotificationTemplatesController],
  providers: [
    NotificationsService,
    NotificationTemplatesService,
    NotificationPreferencesService,
    NotificationDispatcherService,
    NotificationEventListenerService,
  ],
  exports: [NotificationDispatcherService],
})
export class NotificationModule {}
