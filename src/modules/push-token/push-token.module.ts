import { Module } from '@nestjs/common';
import { PushTokenService } from './push-token.service';
import { PushTokenController } from './api/v1/push-token.controller';

/**
 * Push Token Module
 *
 * 푸시 토큰 관리 모듈
 * Active Record 패턴 사용으로 TypeOrmModule.forFeature 불필요
 */
@Module({
  providers: [PushTokenService],
  controllers: [PushTokenController],
  exports: [PushTokenService],
})
export class PushTokenModule {}
