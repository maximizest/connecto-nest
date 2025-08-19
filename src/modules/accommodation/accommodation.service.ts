import { Injectable } from '@nestjs/common';
import { Accommodation } from './accommodation.entity';

/**
 * Accommodation Service - Active Record Pattern
 * 
 * Repository 주입 없이 Accommodation 엔티티의 Active Record 메서드를 활용합니다.
 */
@Injectable()
export class AccommodationService {
  /**
   * ID로 숙박 업소 조회
   */
  async findById(id: number) {
    return Accommodation.findById(id);
  }

  /**
   * 모든 숙박 업소 조회
   */
  async findAll() {
    return Accommodation.find({
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 숙박 업소 생성
   */
  async createAccommodation(data: {
    name: string;
    description?: string;
  }): Promise<Accommodation> {
    const accommodation = Accommodation.create({
      name: data.name,
      description: data.description || null,
    });

    return await accommodation.save();
  }

  /**
   * 숙박 업소 업데이트
   */
  async updateAccommodation(id: number, updateData: Partial<Accommodation>) {
    await Accommodation.update(id, updateData);
    return Accommodation.findById(id);
  }

  /**
   * 숙박 업소 삭제
   */
  async deleteAccommodation(id: number) {
    const accommodation = await Accommodation.findById(id);
    if (accommodation) {
      return accommodation.remove();
    }
    return null;
  }

  /**
   * 숙박 업소 수 조회
   */
  async count() {
    return Accommodation.count();
  }
}