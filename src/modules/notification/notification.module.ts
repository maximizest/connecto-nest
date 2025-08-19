import { Module } from '@nestjs/common';
import { NotificationController } from './api/v1/notification.controller';
import { Notification } from './notification.entity';
import { NotificationService } from './notification.service';
import { PushNotificationService } from './services/push-notification.service';

@Module({
  imports: [],
  providers: [NotificationService, PushNotificationService],
  controllers: [NotificationController],
  exports: [NotificationService, PushNotificationService],
})
export class NotificationModule {}
