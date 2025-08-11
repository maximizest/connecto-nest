import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlanetUser } from './planet-user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PlanetUser])],
  providers: [],
  exports: [],
})
export class PlanetUserModule {}
