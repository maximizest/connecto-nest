import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TravelUser } from './travel-user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TravelUser])],
  providers: [],
  exports: [],
})
export class TravelUserModule {}
