import { Module } from '@nestjs/common';
import { PlanetUserController } from './api/v1/planet-user.controller';
import { PlanetUserService } from './planet-user.service';
import { PlanetUser } from './planet-user.entity';

/**
 * PlanetUser 모듈 - Active Record Pattern
 *
 * TypeOrmModule.forFeature 없이 Active Record 패턴 사용
 */
@Module({
  imports: [],
  controllers: [PlanetUserController],
  providers: [PlanetUserService],
  exports: [PlanetUserService],
})
export class PlanetUserModule {}
