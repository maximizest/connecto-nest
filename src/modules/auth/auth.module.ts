import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ENV_KEYS } from '../../common/constants/app.constants';
import { Admin } from '../admin/admin.entity';
import { FileUpload } from '../file-upload/file-upload.entity';
import { Message } from '../message/message.entity';
import { Notification } from '../notification/notification.entity';
import { PlanetUser } from '../planet-user/planet-user.entity';
import { Profile } from '../profile/profile.entity';
import { MessageReadReceipt } from '../read-receipt/read-receipt.entity';
import { TravelUser } from '../travel-user/travel-user.entity';
import { UserDeletionService } from '../user/services/user-deletion.service';
import { User } from '../user/user.entity';
import { VideoProcessing } from '../video-processing/video-processing.entity';
import { AuthController } from './api/v1/auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      // Auth 관련 기본 entities
      User,
      Profile,

      // UserDeletionService용 추가 entities (회원탈퇴 기능을 위해)
      Admin,
      Message,
      Notification,
      MessageReadReceipt,
      FileUpload,
      VideoProcessing,
      TravelUser,
      PlanetUser,
    ]),

    // JWT 모듈 설정
    JwtModule.register({
      secret: process.env[ENV_KEYS.JWT_SECRET],
      signOptions: {
        expiresIn: process.env[ENV_KEYS.JWT_ACCESS_TOKEN_EXPIRES_IN] || '1h',
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    UserDeletionService, // 회원탈퇴 기능을 위해 포함
  ],
  exports: [
    AuthService,
    JwtModule, // 다른 모듈에서 JWT 사용 가능하도록 export
  ],
})
export class AuthModule {}
