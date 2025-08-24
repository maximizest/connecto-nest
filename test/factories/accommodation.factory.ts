import { Factory } from 'fishery';
import { Accommodation } from '../../src/modules/accommodation/accommodation.entity';

/**
 * Accommodation Factory - Fishery를 사용한 숙박 업소 테스트 데이터 생성
 */
export const AccommodationFactory = Factory.define<Accommodation>(({ sequence }) => {
  const accommodation = new Accommodation();

  // 기본 정보
  accommodation.id = sequence;
  accommodation.name = `테스트 호텔 ${sequence}`;
  accommodation.description = `편안하고 아늑한 숙소입니다. 다양한 편의시설과 훌륭한 서비스를 제공합니다.`;

  // 타임스탬프
  accommodation.createdAt = new Date();
  accommodation.updatedAt = new Date();

  return accommodation;
});