import { Controller, Get, Param, NotFoundException, UseGuards } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { crudResponse } from '@foryourdev/nestjs-crud';
import { ModulesContainer, Reflector } from '@nestjs/core';
import { Injectable } from '@nestjs/common';
import { DevOnlyGuard } from '../../guards/dev-only.guard';
import 'reflect-metadata';

@Controller({
  path: 'schema',
  version: '1',
})
@UseGuards(DevOnlyGuard)
export class SchemaController {
  constructor(
    private readonly dataSource: DataSource,
    private readonly modulesContainer: ModulesContainer,
    private readonly reflector: Reflector,
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





  private getJsType(column: any): string {
    const typeMapping: { [key: string]: string } = {
      'varchar': 'string',
      'text': 'string',
      'char': 'string',
      'int': 'number',
      'integer': 'number',
      'bigint': 'number',
      'decimal': 'number',
      'float': 'number',
      'double': 'number',
      'boolean': 'boolean',
      'date': 'Date',
      'datetime': 'Date',
      'timestamp': 'Date',
      'json': 'object',
      'enum': 'enum',
    };

    return typeMapping[column.type] || 'unknown';
  }

  private getCrudInfo(entityName: string): any {
    const crudMetadata = this.extractCrudMetadata(entityName);

    if (!crudMetadata) {
      return {
        note: `No CRUD controller found for entity: ${entityName}`,
        availableEndpoints: [],
        isConfigured: false,
      };
    }

    return {
      isConfigured: true,
      controllerPath: crudMetadata.controllerPath,
      entityName: crudMetadata.entityName,
      allowedMethods: crudMetadata.allowedMethods,
      allowedFilters: crudMetadata.allowedFilters,
      allowedParams: crudMetadata.allowedParams,
      allowedIncludes: crudMetadata.allowedIncludes,
      routeSettings: crudMetadata.routeSettings,
      availableEndpoints: this.generateEndpoints(crudMetadata),
    };
  }

  private extractCrudMetadata(entityName: string): any {
    const controllers = this.getAllControllers();

    for (const controller of controllers) {
      // 다양한 메타데이터 키 시도
      let crudMetadata = this.reflector.get('__crud_options__', controller.metatype) ||
        this.reflector.get('crud_options', controller.metatype) ||
        this.reflector.get('__crud__', controller.metatype) ||
        this.reflector.get('CRUD_OPTIONS', controller.metatype) ||
        Reflect.getMetadata('__crud_options__', controller.metatype) ||
        Reflect.getMetadata('crud_options', controller.metatype) ||
        Reflect.getMetadata('__crud__', controller.metatype);

      // 메타데이터가 없으면 모든 메타데이터 키 확인
      if (!crudMetadata) {
        const allKeys = Reflect.getMetadataKeys(controller.metatype);
        console.log(`Controller ${controller.metatype.name} metadata keys:`, allKeys);

        // CRUD 관련으로 보이는 키 찾기
        const crudKey = allKeys.find(key =>
          typeof key === 'string' &&
          key.toLowerCase().includes('crud')
        );

        if (crudKey) {
          crudMetadata = Reflect.getMetadata(crudKey, controller.metatype);
          console.log(`Found CRUD metadata with key "${crudKey}":`, crudMetadata);
        }
      }

      if (crudMetadata && crudMetadata.entity) {
        const entityMetadata = crudMetadata.entity;
        const controllerEntityName = typeof entityMetadata === 'function'
          ? entityMetadata.name
          : entityMetadata;

        if (controllerEntityName.toLowerCase() === entityName.toLowerCase()) {
          // 컨트롤러 경로 추출
          const controllerPath = this.getControllerPath(controller.metatype);

          return {
            controllerName: controller.metatype.name,
            controllerPath: controllerPath,
            entityName: controllerEntityName,
            allowedMethods: crudMetadata.only || ['index', 'show', 'create', 'update', 'destroy'],
            allowedFilters: crudMetadata.allowedFilters || [],
            allowedParams: crudMetadata.allowedParams || [],
            allowedIncludes: crudMetadata.allowedIncludes || [],
            routeSettings: crudMetadata.routes || {},
            paginationType: crudMetadata.paginationType,
            softDelete: crudMetadata.softDelete,
            logging: crudMetadata.logging,
          };
        }
      }
    }

    return null;
  }

  private getControllerPath(controllerClass: any): string {
    // @Controller 데코레이터에서 path 추출
    const controllerMetadata = this.reflector.get('path', controllerClass) ||
      Reflect.getMetadata('path', controllerClass) ||
      Reflect.getMetadata('__controller_path__', controllerClass);

    if (controllerMetadata) {
      return controllerMetadata;
    }

    // 메타데이터에서 컨트롤러 옵션 확인
    const allKeys = Reflect.getMetadataKeys(controllerClass);
    for (const key of allKeys) {
      const metadata = Reflect.getMetadata(key, controllerClass);
      if (metadata && typeof metadata === 'object' && metadata.path) {
        return metadata.path;
      }
    }

    // 기본값: 컨트롤러 이름에서 추출
    return controllerClass.name.toLowerCase().replace('controller', '');
  }

  private getAllControllers(): any[] {
    const controllers: any[] = [];

    for (const module of this.modulesContainer.values()) {
      for (const controller of module.controllers.values()) {
        if (controller.metatype && controller.metatype !== SchemaController) {
          (controllers as any).push(controller);
        }
      }
    }

    return controllers;
  }

  private generateEndpoints(crudMetadata: any): string[] {
    const basePath = crudMetadata.controllerPath || crudMetadata.entityName.toLowerCase() + 's';
    const endpoints: string[] = [];
    const allowedMethods = crudMetadata.allowedMethods;

    if (allowedMethods.includes && allowedMethods.includes('index')) {
      (endpoints as any).push(`GET /${basePath}`);
    }

    if (allowedMethods.includes && allowedMethods.includes('show')) {
      (endpoints as any).push(`GET /${basePath}/:id`);
    }

    if (allowedMethods.includes && allowedMethods.includes('create')) {
      (endpoints as any).push(`POST /${basePath}`);
    }

    if (allowedMethods.includes && allowedMethods.includes('update')) {
      (endpoints as any).push(`PUT /${basePath}/:id`);
    }

    if (allowedMethods.includes && allowedMethods.includes('destroy')) {
      (endpoints as any).push(`DELETE /${basePath}/:id`);
    }

    if (allowedMethods.includes && allowedMethods.includes('upsert')) {
      (endpoints as any).push(`POST /${basePath}/upsert`);
    }

    if (allowedMethods.includes && allowedMethods.includes('recover')) {
      (endpoints as any).push(`POST /${basePath}/:id/recover`);
    }

    return endpoints;
  }
} 