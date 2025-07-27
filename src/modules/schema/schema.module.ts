import { Module } from '@nestjs/common';
import { SchemaController } from './schema.controller';
import { DevOnlyGuard } from '../../guards/dev-only.guard';

@Module({
  controllers: [SchemaController],
  providers: [DevOnlyGuard],
})
export class SchemaModule { } 