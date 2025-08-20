import { Module } from '@nestjs/common';
import { PlanetController } from './api/v1/planet.controller';
import { PlanetService } from './planet.service';
import { Planet } from './planet.entity';

/**
 * Planet 모듈 - Active Record Pattern
 *
 * TypeOrmModule.forFeature 없이 Active Record 패턴 사용
 */
@Module({
  imports: [],
  controllers: [PlanetController],
  providers: [PlanetService],
  exports: [PlanetService],
})
export class PlanetModule {}
