import { Module } from '@nestjs/common';
import { ReportService } from './report.service';
import { ReportController } from './api/v1/report.controller';
@Module({
  imports: [],
  controllers: [ReportController],
  providers: [ReportService],
  exports: [ReportService],
})
export class ReportModule {}
