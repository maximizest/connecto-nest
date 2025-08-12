import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Admin } from '../admin/admin.entity';
import { FileUpload } from '../file-upload/file-upload.entity';
import { Message } from '../message/message.entity';
import { Notification } from '../notification/notification.entity';
import { PlanetUser } from '../planet-user/planet-user.entity';
import { Planet } from '../planet/planet.entity';
import { Profile } from '../profile/profile.entity';
import { MessageReadReceipt } from '../read-receipt/read-receipt.entity';
import { StreamingSession } from '../streaming/streaming-session.entity';
import { TravelUser } from '../travel-user/travel-user.entity';
import { Travel } from '../travel/travel.entity';
import { VideoProcessing } from '../video-processing/video-processing.entity';
import { UserController } from './api/v1/user.controller';
import { UserDeletionService } from './services/user-deletion.service';
import { User } from './user.entity';
import { UserService } from './user.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      // User 관련 기본 entities
      User,
      Travel,
      Planet,
      TravelUser,
      PlanetUser,
      // UserDeletionService용 추가 entities
      Profile,
      Admin,
      Message,
      Notification,
      MessageReadReceipt,
      FileUpload,
      VideoProcessing,
      StreamingSession,
    ]),
  ],
  controllers: [UserController],
  providers: [UserService, UserDeletionService],
  exports: [UserService, UserDeletionService],
})
export class UserModule {}
