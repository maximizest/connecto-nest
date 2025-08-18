import { CrudService } from '@foryourdev/nestjs-crud';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Accommodation } from './accommodation.entity';

@Injectable()
export class AccommodationService extends CrudService<Accommodation> {
  constructor(
    @InjectRepository(Accommodation)
    accommodationRepository: Repository<Accommodation>,
  ) {
    super(accommodationRepository);
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
   * 숙박 업소 수정
   */
  async updateAccommodation(
    id: number,
    data: {
      name?: string;
      description?: string;
    },
  ): Promise<Accommodation> {
    const accommodation = await Accommodation.findOne({
      where: { id },
    });

    if (!accommodation) {
      throw new Error('숙박 업소를 찾을 수 없습니다.');
    }

    if (data.name !== undefined) {
      accommodation.name = data.name;
    }
    if (data.description !== undefined) {
      accommodation.description = data.description;
    }

    return await accommodation.save();
  }

  /**
   * 숙박 업소와 관련된 Travel 목록 조회
   */
  async getAccommodationWithTravels(id: number): Promise<Accommodation | null> {
    return await Accommodation.findOne({
      where: { id },
      relations: ['travels'],
    });
  }
}