import { Controller, Get, Param, NotFoundException, UseGuards } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { crudResponse } from '@foryourdev/nestjs-crud';
import { DevOnlyGuard } from '../../guards/dev-only.guard';
import { CrudMetadataService } from './services/crud-metadata.service';
import { SCHEMA_CONSTANTS } from './constants/schema.constants';
import { ColumnMetadata, SchemaEntityInfo } from './types/schema.types';
import 'reflect-metadata';

@Controller({
  path: 'schema',
  version: '1',
})
@UseGuards(DevOnlyGuard)
export class SchemaController {
  constructor(
    private readonly dataSource: DataSource,
    private readonly crudMetadataService: CrudMetadataService,
  ) { }

  @Get()
  async index() {
    const metadata = this.dataSource.entityMetadatas;

    const modelsInfo = metadata.map(entityMetadata => {
      // 컬럼 정보 추출
      const columns = entityMetadata.columns.map(column => ({
        name: column.propertyName,
        databaseName: column.databaseName,
        type: column.type,
        isPrimary: column.isPrimary,
        isGenerated: column.isGenerated,
        isNullable: column.isNullable,
        default: column.default,
        length: column.length,
        precision: column.precision,
        scale: column.scale,
        comment: column.comment,
        enum: column.enum,
        // 메타데이터 정보 추가
        metadata: this.getColumnMetadata(column),
      }));

      // 관계 정보 추출
      const relations = entityMetadata.relations.map(relation => ({
        name: relation.propertyName,
        type: relation.relationType,
        target: typeof relation.type === 'function' ? relation.type.name : String(relation.type),
        inverseSide: relation.inverseSidePropertyPath,
        isOwner: relation.isOwning,
        isCascade: relation.isCascadeInsert || relation.isCascadeUpdate || relation.isCascadeRemove,
        joinColumn: relation.joinColumns?.map(jc => ({
          name: jc.databaseName,
          referencedColumnName: jc.referencedColumn?.databaseName,
        })),
        joinTable: relation.joinTableName,
      }));

      // 인덱스 정보 추출
      const indices = entityMetadata.indices.map(index => ({
        name: index.name,
        columns: index.columns.map(column => column.databaseName),
        isUnique: index.isUnique,
        where: index.where,
      }));

      // 기본 키 정보
      const primaryKeys = entityMetadata.primaryColumns.map(column => ({
        name: column.propertyName,
        databaseName: column.databaseName,
        type: column.type,
        isGenerated: column.isGenerated,
        generationStrategy: column.generationStrategy,
      }));

      return {
        entityName: entityMetadata.name,
        tableName: entityMetadata.tableName,
        schema: entityMetadata.schema,
        database: entityMetadata.database,
        targetName: (entityMetadata.target as any).name || 'Unknown',
        primaryKeys,
        columns,
        relations,
        indices,
        checks: entityMetadata.checks.map(check => ({
          name: check.name,
          expression: check.expression,
        })),
        uniques: entityMetadata.uniques.map(unique => ({
          name: unique.name,
          columns: unique.columns.map(column => column.databaseName),
        })),
        foreignKeys: entityMetadata.foreignKeys.map(fk => ({
          name: fk.name,
          columns: fk.columns.map(column => column.databaseName),
          referencedTable: fk.referencedTablePath,
          referencedColumns: fk.referencedColumns.map(column => column.databaseName),
          onDelete: fk.onDelete,
          onUpdate: fk.onUpdate,
        })),
        // TypeORM 설정 정보
        engine: entityMetadata.engine,
        synchronize: entityMetadata.synchronize,
        withoutRowid: entityMetadata.withoutRowid,
      };
    });

    return crudResponse(modelsInfo);
  }

  @Get(':entityName')
  async show(@Param('entityName') entityName: string) {
    const metadata = this.dataSource.entityMetadatas;
    const entityMetadata = metadata.find(meta =>
      meta.name.toLowerCase() === entityName.toLowerCase() ||
      meta.tableName.toLowerCase() === entityName.toLowerCase()
    );

    if (!entityMetadata) {
      throw new NotFoundException(`Entity '${entityName}' not found`);
    }

    // 상세한 컬럼 정보
    const columns = entityMetadata.columns.map(column => ({
      name: column.propertyName,
      databaseName: column.databaseName,
      type: column.type,
      jsType: column.type,
      isPrimary: column.isPrimary,
      isGenerated: column.isGenerated,
      generationStrategy: column.generationStrategy,
      isNullable: column.isNullable,
      isArray: column.isArray,
      default: column.default,
      length: column.length,
      width: column.width,
      precision: column.precision,
      scale: column.scale,
      zerofill: column.zerofill,
      unsigned: column.unsigned,
      charset: column.charset,
      collation: column.collation,
      comment: column.comment,
      enum: column.enum,
      enumName: column.enumName,
      asExpression: column.asExpression,
      generatedType: column.generatedType,
      // 메타데이터 정보 추가
      metadata: this.getColumnMetadata(column),
    }));

    const entityInfo = {
      entityName: entityMetadata.name,
      tableName: entityMetadata.tableName,
      targetName: (entityMetadata.target as any).name || 'Unknown',
      columns,
      relations: entityMetadata.relations.map(relation => ({
        name: relation.propertyName,
        type: relation.relationType,
        target: typeof relation.type === 'function' ? relation.type.name : String(relation.type),
        inverseSide: relation.inverseSidePropertyPath,
        isOwner: relation.isOwning,
        isLazy: relation.isLazy,
        isCascade: {
          insert: relation.isCascadeInsert,
          update: relation.isCascadeUpdate,
          remove: relation.isCascadeRemove,
          softRemove: relation.isCascadeSoftRemove,
          recover: relation.isCascadeRecover,
        },
        onDelete: relation.onDelete,
        onUpdate: relation.onUpdate,
        nullable: relation.isNullable,
        joinColumns: relation.joinColumns?.map(jc => ({
          name: jc.databaseName,
          referencedColumnName: jc.referencedColumn?.databaseName,
        })),
        joinTable: relation.joinTableName || null,
      })),
      // CRUD 설정 정보 (실제 컨트롤러에서 추출)
      crudInfo: this.getCrudInfo(entityMetadata.name),
    };

    return crudResponse(entityInfo);
  }

  private getColumnMetadata(column: any): any {
    return {
      type: column.type,
      jsType: this.getJsType(column),
      isEnum: !!column.enum,
      enumValues: column.enum,
      isNullable: column.isNullable,
      isPrimary: column.isPrimary,
      isGenerated: column.isGenerated,
      length: column.length,
      default: column.default,
    };
  }





  /**
   * 데이터베이스 타입을 JavaScript 타입으로 변환합니다.
   */
  private getJsType(column: any): string {
    return SCHEMA_CONSTANTS.JS_TYPE_MAPPING[column.type as keyof typeof SCHEMA_CONSTANTS.JS_TYPE_MAPPING] || 'unknown';
  }

  /**
 * 엔티티의 CRUD 설정 정보를 반환합니다.
 */
  private getCrudInfo(entityName: string) {
    return this.crudMetadataService.getCrudInfo(entityName);
  }
} 