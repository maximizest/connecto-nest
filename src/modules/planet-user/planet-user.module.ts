import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlanetUserController } from './api/v1/planet-user.controller';
import { PlanetUserService } from './planet-user.service';
import { PlanetUser } from './planet-user.entity';

/**
 * PlanetUser 모듈 - Hybrid Pattern (CrudService + Active Record)
 *
 * CrudService를 확장하면서 PlanetUser 엔티티의 Active Record 메서드도 활용합니다.
 */
@Module({
  imports: [TypeOrmModule.forFeature([PlanetUser])],
  controllers: [PlanetUserController],
  providers: [PlanetUserService],
  exports: [PlanetUserService],
})
export class PlanetUserModule {}
