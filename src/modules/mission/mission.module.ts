import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Mission } from './mission.entity';
import { MissionService } from './mission.service';
import { MissionController } from './api/v1/mission.controller';

/**
 * Mission Module
 *
 * 미션 시스템을 담당하는 모듈입니다.
 * 여행에 속한 사용자들에게 다양한 미션을 제공하여 여행 몰입도를 높입니다.
 *
 * 주요 기능:
 * - 미션 생성 및 관리 (이미지, 비디오, 밸런스 게임)
 * - 미션을 여행에 할당
 * - 미션 제출 및 평가
 * - 실시간 미션 알림 (WebSocket)
 * - 미션 통계 및 진행 상황 추적
 *
 * 확장 가능한 구조:
 * - MissionType enum에 새로운 타입 추가 가능
 * - metadata 필드를 통한 유연한 데이터 저장
 * - 타입별 핸들러 패턴으로 새로운 미션 타입 쉽게 추가
 */
@Module({
  imports: [TypeOrmModule.forFeature([Mission])],
  controllers: [MissionController],
  providers: [MissionService],
  exports: [MissionService],
})
export class MissionModule {}
