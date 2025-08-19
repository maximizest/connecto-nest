import { Injectable } from '@nestjs/common';
import { Planet } from './planet.entity';
import { PlanetType } from './enums/planet-type.enum';
import { PlanetStatus } from './enums/planet-status.enum';
import { TimeRestrictionType } from './enums/time-restriction-type.enum';

/**
 * Planet Service - Active Record Pattern
 *
 * Repository 주입 없이 Planet 엔티티의 Active Record 메서드를 활용합니다.
 */
@Injectable()
export class PlanetService {
  /**
   * ID로 Planet 조회
   */
  async findById(id: number) {
    return Planet.findById(id);
  }

  /**
   * Travel의 Planet 조회
   */
  async findByTravel(travelId: number) {
    return Planet.findByTravel(travelId);
  }

  /**
   * Travel의 활성 Planet 조회
   */
  async findActivePlanetsByTravel(travelId: number) {
    return Planet.findActivePlanetsByTravel(travelId);
  }

  /**
   * 타입별 Planet 조회
   */
  async findByType(type: PlanetType) {
    return Planet.findByType(type);
  }

  /**
   * 단체 Planet 조회
   */
  async findGroupPlanetsByTravel(travelId: number) {
    return Planet.findGroupPlanetsByTravel(travelId);
  }

  /**
   * 1:1 Planet 조회
   */
  async findDirectPlanetsByTravel(travelId: number) {
    return Planet.findDirectPlanetsByTravel(travelId);
  }

  /**
   * Planet 생성
   */
  async createPlanet(planetData: {
    name: string;
    description?: string;
    type: PlanetType;
    travelId: number;
    imageUrl?: string;
    timeRestriction?: any;
  }) {
    return Planet.createPlanet(planetData);
  }

  /**
   * Planet 업데이트
   */
  async updatePlanet(id: number, updateData: Partial<Planet>) {
    await Planet.update(id, updateData);
    return Planet.findById(id);
  }

  /**
   * Planet 상태 업데이트
   */
  async updateStatus(planetId: number, status: PlanetStatus) {
    return Planet.updateStatus(planetId, status);
  }

  /**
   * Planet 삭제
   */
  async deletePlanet(id: number) {
    const planet = await Planet.findById(id);
    if (planet) {
      return planet.remove();
    }
    return null;
  }

  /**
   * Travel의 모든 Planet 비활성화
   */
  async deactivateByTravel(travelId: number) {
    return Planet.deactivateByTravel(travelId);
  }

  /**
   * Planet 수 조회
   */
  async count() {
    return Planet.count();
  }
}
