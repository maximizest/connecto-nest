import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Planet } from '../planet/planet.entity';
import { Travel } from '../travel/travel.entity';
import { User } from '../user/user.entity';
import { NotificationController } from './api/v1/notification.controller';
import { Notification } from './notification.entity';
import { NotificationService } from './notification.service';
import { PushNotificationService } from './services/push-notification.service';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, User, Travel, Planet])],
  providers: [NotificationService, PushNotificationService],
  controllers: [NotificationController],
  exports: [NotificationService, PushNotificationService],
})
export class NotificationModule {}
