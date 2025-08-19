import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationController } from './api/v1/notification.controller';
import { Notification } from './notification.entity';
import { NotificationService } from './notification.service';
import { PushNotificationService } from './services/push-notification.service';

@Module({
  imports: [TypeOrmModule.forFeature([Notification])],
  providers: [NotificationService, PushNotificationService],
  controllers: [NotificationController],
  exports: [NotificationService, PushNotificationService],
})
export class NotificationModule {}
