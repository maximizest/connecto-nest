import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Accommodation } from './accommodation.entity';
import { AccommodationService } from './accommodation.service';
import { AccommodationController } from './api/v1/accommodation.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Accommodation])],
  controllers: [AccommodationController],
  providers: [AccommodationService],
  exports: [AccommodationService],
})
export class AccommodationModule {}
