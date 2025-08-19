import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlanetController } from './api/v1/planet.controller';
import { PlanetService } from './planet.service';
import { Planet } from './planet.entity';

/**
 * Planet 모듈 - Hybrid Pattern (CrudService + Active Record)
 *
 * CrudService를 확장하면서 Planet 엔티티의 Active Record 메서드도 활용합니다.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Planet])],
  controllers: [PlanetController],
  providers: [PlanetService],
  exports: [PlanetService],
})
export class PlanetModule {}
