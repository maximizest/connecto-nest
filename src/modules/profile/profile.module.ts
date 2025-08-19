import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfileController } from './api/v1/profile.controller';
import { ProfileService } from './profile.service';
import { Profile } from './profile.entity';

/**
 * Profile 모듈 - Hybrid Pattern (CrudService + Active Record)
 *
 * 사용자 프로필 관련 기능을 제공합니다.
 * - 1:1 User-Profile 관계
 * - CrudService와 Active Record 패턴 병행 사용
 * - Repository 주입과 Active Record 모두 지원
 */
@Module({
  imports: [TypeOrmModule.forFeature([Profile])],
  controllers: [ProfileController],
  providers: [ProfileService],
  exports: [ProfileService], // 다른 모듈에서 사용할 수 있도록 export
})
export class ProfileModule {}
