import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TravelUserController } from './api/v1/travel-user.controller';
import { TravelUserService } from './travel-user.service';
import { TravelUser } from './travel-user.entity';

/**
 * TravelUser 모듈 - Hybrid Pattern (CrudService + Active Record)
 *
 * CrudService를 확장하면서 TravelUser 엔티티의 Active Record 메서드도 활용합니다.
 */
@Module({
  imports: [TypeOrmModule.forFeature([TravelUser])],
  controllers: [TravelUserController],
  providers: [TravelUserService],
  exports: [TravelUserService],
})
export class TravelUserModule {}
