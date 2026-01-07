export interface TableMetadata {
  name: string;
  schema: string;
  description: string;
  source: 'inferred' | 'human' | 'overridden';
  confidence: number;
  columns: ColumnMetadata[];
  indexes?: IndexMetadata[];
}

export interface ColumnMetadata {
  name: string;
  type: string;
  nullable: boolean;
  primaryKey: boolean;
  foreignKey?: ForeignKey;
  description: string;
  source: 'inferred' | 'human' | 'overridden';
  confidence: number;
}

export interface ForeignKey {
  table: string;
  column: string;
}

export interface IndexMetadata {
  name: string;
  columns: string[];
  unique: boolean;
}

export interface SchemaMetadata {
  catalog: string;
  version: string;
  lastUpdated: string;
  tables: TableMetadata[];
}

export interface ExtractorConfig {
  type: 'ddl' | 'prisma' | 'sqlalchemy' | 'activerecord' | 'alembic' | 'flyway' | 'liquibase';
  path: string;
}

export interface ExtractorResult {
  tables: TableMetadata[];
  version: string;
}
