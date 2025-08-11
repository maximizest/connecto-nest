import { Module } from '@nestjs/common';
import { DevOnlyGuard } from '../../guards/dev-only.guard';
import { SchemaController } from './api/v1/schema.controller';
import { CrudMetadataService } from './services/crud-metadata.service';
import { SecurityValidationService } from './services/security-validation.service';

@Module({
  controllers: [SchemaController],
  providers: [DevOnlyGuard, SecurityValidationService, CrudMetadataService],
})
export class SchemaModule {}
