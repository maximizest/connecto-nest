import { Module } from '@nestjs/common';
import { ModerationController } from './api/v1/moderation.controller';

@Module({
  imports: [],
  controllers: [ModerationController],
  providers: [],
  exports: [],
})
export class ModerationModule {}
