import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MissionSubmission } from './mission-submission.entity';
import { MissionSubmissionService } from './mission-submission.service';
import { MissionSubmissionController } from './api/v1/mission-submission.controller';

@Module({
  imports: [TypeOrmModule.forFeature([MissionSubmission])],
  controllers: [MissionSubmissionController],
  providers: [MissionSubmissionService],
  exports: [MissionSubmissionService],
})
export class MissionSubmissionModule {}
