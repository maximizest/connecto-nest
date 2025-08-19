import { Module } from '@nestjs/common';
import { PlanetUserController } from './api/v1/planet-user.controller';
import { PlanetUserService } from './planet-user.service';

/**
 * PlanetUser 모듈 - Active Record Pattern
 * 
 * Repository 주입 없이 PlanetUser 엔티티의 Active Record 메서드를 활용합니다.
 */
@Module({
  controllers: [PlanetUserController],
  providers: [PlanetUserService],
  exports: [PlanetUserService],
})
export class PlanetUserModule {}
