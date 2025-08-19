import { Module } from '@nestjs/common';
import { ProfileController } from './api/v1/profile.controller';
import { ProfileService } from './profile.service';

/**
 * Profile 모듈 - Active Record Pattern
 *
 * 사용자 프로필 관련 기능을 제공합니다.
 * - 1:1 User-Profile 관계
 * - Active Record 패턴 사용
 * - Repository 의존성 제거됨
 */
@Module({
  controllers: [ProfileController],
  providers: [ProfileService],
  exports: [ProfileService], // 다른 모듈에서 사용할 수 있도록 export
})
export class ProfileModule {}
