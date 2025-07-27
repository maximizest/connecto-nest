export interface ColumnMetadata {
  type: string;
  jsType: string;
  isEnum: boolean;
  enumValues: any;
  isNullable: boolean;
  isPrimary: boolean;
  isGenerated: boolean;
  length: string | number | null;
  default: any;
}

export interface CrudMetadata {
  controllerName: string;
  controllerPath: string;
  entityName: string;
  allowedMethods: string[];
  allowedFilters: string[];
  allowedParams: string[];
  allowedIncludes: string[];
  routeSettings: Record<string, any>;
  paginationType?: string;
  softDelete?: boolean;
  logging?: boolean;
}

export interface CrudInfo {
  isConfigured: boolean;
  controllerPath?: string;
  entityName?: string;
  allowedMethods?: string[];
  allowedFilters?: string[];
  allowedParams?: string[];
  allowedIncludes?: string[];
  routeSettings?: Record<string, any>;
  availableEndpoints: string[];
  note?: string;
}

export interface ControllerWrapper {
  metatype: any;
}

export interface SchemaEntityInfo {
  entityName: string;
  tableName: string;
  schema?: string;
  database?: string;
  targetName: string;
  primaryKeys: any[];
  columns: any[];
  relations: any[];
  indices: any[];
  checks: any[];
  uniques: any[];
  foreignKeys: any[];
  engine?: string;
  synchronize?: boolean;
  withoutRowid?: boolean;
}

export interface SecurityValidationResult {
  isAllowed: boolean;
  errorMessage?: string;
  errorCode?: string;
  hint?: string;
  clientIP?: string;
} 