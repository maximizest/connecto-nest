import { Factory } from 'fishery';
import {
  Planet,
  PlanetStatus,
  PlanetType,
} from '../../src/modules/planet/planet.entity';

/**
 * Planet Factory - Fishery를 사용한 플래닛(채팅방) 테스트 데이터 생성
 * 주의: travelId, createdBy 필드는 별도로 설정해야 합니다
 */
export const PlanetFactory = Factory.define<Planet>(({ sequence }) => {
  const planet = new Planet();

  // 기본 플래닛 정보
  planet.name = `테스트플래닛${sequence}`;
  planet.description = `테스트 플래닛 ${sequence}에 대한 설명입니다.`;
  planet.imageUrl = `https://example.com/planet/${sequence}/image.jpg`;

  // 타입 및 소속 (테스트에서 별도 설정 필요)
  planet.type = PlanetType.GROUP;
  planet.travelId = 1; // 기본값, 실제 테스트에서는 실제 Travel ID로 설정
  planet.createdBy = 1; // 기본값, 실제 테스트에서는 실제 사용자 ID로 설정

  // 상태 관리
  planet.status = PlanetStatus.ACTIVE;
  planet.isActive = true;

  // 시간 제한 설정
  planet.timeRestriction = undefined;

  // 멤버 관리
  planet.memberCount = 1; // 생성자 포함
  planet.maxMembers = 100; // 그룹 채팅 기본값

  // 메시지 통계
  planet.messageCount = 0;
  planet.lastMessageAt = undefined;
  planet.lastMessagePreview = undefined;
  planet.lastMessageUserId = undefined;

  // Planet 설정
  planet.settings = {
    allowFileUpload: true,
    allowedFileTypes: ['jpg', 'png', 'pdf', 'txt'],
    maxFileSize: 10485760, // 10MB
    readReceiptsEnabled: true,
    typingIndicatorsEnabled: true,
    notificationsEnabled: true,
  };

  // 1:1 채팅 전용 필드
  planet.partnerId = undefined;

  // 메타데이터
  planet.metadata = undefined;

  // 타임스탬프
  planet.createdAt = new Date();
  planet.updatedAt = new Date();

  return planet;
});
