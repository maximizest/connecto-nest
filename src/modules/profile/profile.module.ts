import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfileController } from './api/v1/profile.controller';
import { Profile } from './profile.entity';
import { ProfileService } from './profile.service';

/**
 * Profile 모듈
 *
 * 사용자 프로필 관련 기능을 제공합니다.
 * - 1:1 User-Profile 관계
 * - CRUD API (nestjs-crud 기반)
 * - 자동 생성되는 RESTful 엔드포인트
 */
@Module({
  imports: [TypeOrmModule.forFeature([Profile])],
  controllers: [ProfileController],
  providers: [ProfileService],
  exports: [ProfileService], // 다른 모듈에서 사용할 수 있도록 export
})
export class ProfileModule {}
