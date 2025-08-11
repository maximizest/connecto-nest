import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Planet } from './planet.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Planet])],
  providers: [],
  exports: [],
})
export class PlanetModule {}
