import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MissionSubmissionService } from './mission-submission.service';
import { MissionSubmissionController } from './api/v1/mission-submission.controller';
import { MissionSubmission } from './mission-submission.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MissionSubmission])],
  controllers: [MissionSubmissionController],
  providers: [MissionSubmissionService],
  exports: [MissionSubmissionService],
})
export class MissionSubmissionModule {}
