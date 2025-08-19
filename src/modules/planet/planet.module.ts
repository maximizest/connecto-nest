import { Module } from '@nestjs/common';
import { PlanetController } from './api/v1/planet.controller';
import { PlanetService } from './planet.service';

/**
 * Planet 모듈 - Active Record Pattern
 *
 * Repository 주입 없이 Planet 엔티티의 Active Record 메서드를 활용합니다.
 */
@Module({
  controllers: [PlanetController],
  providers: [PlanetService],
  exports: [PlanetService],
})
export class PlanetModule {}
