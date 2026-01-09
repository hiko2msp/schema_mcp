import { BaseExtractor } from './base.js';
import type { ExtractorResult, TableMetadata, ColumnMetadata } from '../core/types.js';
import { readFile } from 'fs/promises';

interface PrismaModel {
  name: string;
  fields: PrismaField[];
  indexes?: PrismaIndex[];
}

interface PrismaField {
  name: string;
  type: string;
  kind: 'scalar' | 'object' | 'enum';
  isOptional: boolean;
  isList: boolean;
  isUnique: boolean;
  isId: boolean;
  default?: string;
  relationName?: string;
  relationToFields?: string[];
}

interface PrismaIndex {
  name?: string;
  fields: string[];
  isUnique: boolean;
}

export class PrismaExtractor extends BaseExtractor {
  async extract(): Promise<ExtractorResult> {
    const content = await readFile(this.config.path, 'utf-8');
    const models = this.parsePrismaSchema(content);
    const tables = models.map(model => this.convertModelToTable(model));

    return {
      tables,
      version: this.generateVersion(content),
    };
  }

  private parsePrismaSchema(content: string): PrismaModel[] {
    const models: PrismaModel[] = [];
    const modelRegex = /model\s+(\w+)\s*\{([\s\S]*?)\}/g;
    
    let match;
    while ((match = modelRegex.exec(content)) !== null) {
      const modelName = match[1];
      const modelContent = match[2];
      
      const model = this.parseModel(modelName, modelContent);
      models.push(model);
    }
    
    return models;
  }

  private parseModel(name: string, content: string): PrismaModel {
    const fields: PrismaField[] = [];
    const indexes: PrismaIndex[] = [];
    
    // Parse fields
    const fieldLines = content.split('\n').filter(line => 
      line.trim() && !line.trim().startsWith('@@') && !line.trim().startsWith('//')
    );
    
    for (const line of fieldLines) {
      const field = this.parseField(line.trim());
      if (field) {
        fields.push(field);
      }
    }
    
    // Parse indexes
    const indexRegex = /@@index\(\[([^\]]+)\](?:\s+(.+))?/g;
    let indexMatch;
    while ((indexMatch = indexRegex.exec(content)) !== null) {
      const fields = indexMatch[1].split(',').map(f => f.trim().replace(/"/g, ''));
      const name = indexMatch[2]?.match(/name:\s*"([^"]+)"/)?.[1];
      
      indexes.push({
        name,
        fields,
        isUnique: false,
      });
    }
    
    // Parse unique indexes
    const uniqueRegex = /@@unique\(\[([^\]]+)\](?:\s+(.+))?/g;
    let uniqueMatch;
    while ((uniqueMatch = uniqueRegex.exec(content)) !== null) {
      const fields = uniqueMatch[1].split(',').map(f => f.trim().replace(/"/g, ''));
      const name = uniqueMatch[2]?.match(/name:\s*"([^"]+)"/)?.[1];
      
      indexes.push({
        name,
        fields,
        isUnique: true,
      });
    }
    
    return { name, fields, indexes };
  }

  private parseField(line: string): PrismaField | null {
    // Skip comments and empty lines
    if (line.startsWith('//') || !line.trim()) {
      return null;
    }
    
    const parts = line.split(/\s+/);
    if (parts.length < 2) {
      return null;
    }
    
    const name = parts[0];
    const type = parts[1];
    
    const field: PrismaField = {
      name,
      type,
      kind: this.getFieldKind(type),
      isOptional: line.includes('?'),
      isList: line.includes('[]'),
      isUnique: line.includes('@unique'),
      isId: line.includes('@id'),
    };
    
    // Extract default value
    const defaultMatch = line.match(/@default\(([^)]+)\)/);
    if (defaultMatch) {
      field.default = defaultMatch[1];
    }
    
    // Extract relation info
    const relationMatch = line.match(/@relation\(([^)]+)\)/);
    if (relationMatch) {
      const relationContent = relationMatch[1];
      field.relationName = relationContent.match(/name:\s*"([^"]+)"/)?.[1];
      field.relationToFields = relationContent.match(/fields:\s*\[([^\]]+)\]/)?.[1]?.split(',').map(f => f.trim().replace(/"/g, ''));
    }
    
    return field;
  }

  private getFieldKind(type: string): 'scalar' | 'object' | 'enum' {
    const scalarTypes = ['String', 'Int', 'Float', 'Boolean', 'DateTime', 'Json', 'Bytes'];
    return scalarTypes.includes(type) ? 'scalar' : 'object';
  }

  private convertModelToTable(model: PrismaModel): TableMetadata {
    const columns: ColumnMetadata[] = [];
    
    // Process ALL fields (both scalar and object)
    for (const field of model.fields) {
      columns.push(this.convertFieldToColumn(field));
    }
    
    // Process relation fields and add foreign key info to corresponding scalar fields
    for (const field of model.fields) {
      if (field.kind === 'object' && field.relationToFields && field.relationToFields.length > 0) {
        // Find the corresponding scalar field and add foreign key info
        const scalarFieldName = field.relationToFields[0];
        const scalarColumn = columns.find(c => c.name === this.toSnakeCase(scalarFieldName));
        
        if (scalarColumn) {
          scalarColumn.foreignKey = {
            table: this.toSnakeCase(field.type),
            column: 'id',
          };
        }
      }
    }
    
    return {
      name: this.toSnakeCase(model.name),
      schema: 'public',
      description: this.inferTableDescription(model.name),
      source: 'inferred',
      confidence: 0.8,
      columns,
      indexes: model.indexes?.map(index => ({
        name: index.name || `idx_${model.name}_${index.fields.join('_')}`,
        columns: index.fields.map(f => this.toSnakeCase(f)),
        unique: index.isUnique,
      })),
    };
  }

  private convertFieldToColumn(field: PrismaField): ColumnMetadata {
    const column: ColumnMetadata = {
      name: this.toSnakeCase(field.name),
      type: this.mapPrismaTypeToSQL(field.type),
      nullable: field.isOptional,
      primaryKey: field.isId,
      description: this.inferColumnDescription(field),
      source: 'inferred',
      confidence: 0.8,
    };
    
    // For relation fields, we don't add foreign key info here
    // It's added in the main conversion method
    
    return column;
  }

  private mapPrismaTypeToSQL(prismaType: string): string {
    const typeMap: Record<string, string> = {
      'String': 'VARCHAR(255)',
      'Int': 'INTEGER',
      'Float': 'DOUBLE PRECISION',
      'Boolean': 'BOOLEAN',
      'DateTime': 'TIMESTAMP',
      'Json': 'JSONB',
      'Bytes': 'BYTEA',
    };
    
    return typeMap[prismaType] || 'VARCHAR(255)';
  }

  private inferTableDescription(tableName: string): string {
    const name = tableName.toLowerCase();
    
    if (name.includes('user')) return 'Stores user account information';
    if (name.includes('order')) return 'Contains order data and details';
    if (name.includes('product')) return 'Product catalog and inventory';
    if (name.includes('category')) return 'Product categories and classifications';
    if (name.includes('payment')) return 'Payment transaction records';
    if (name.includes('session')) return 'User session management data';
    if (name.includes('log') || name.includes('audit')) return 'System logs and audit trail';
    if (name.includes('setting') || name.includes('config')) return 'System configuration and settings';
    if (name.includes('role') || name.includes('permission')) return 'User roles and permissions';
    
    return `Table for ${tableName.replace(/_/g, ' ')} data`;
  }

  private inferColumnDescription(field: PrismaField): string {
    const name = field.name.toLowerCase();
    
    if (name.includes('id')) return `Unique identifier for the ${field.type.toLowerCase()}`;
    if (name.includes('created') || name.includes('at')) return 'Timestamp when record was created';
    if (name.includes('updated') || name.includes('modified')) return 'Timestamp when record was last updated';
    if (name.includes('email')) return 'Email address for contact';
    if (name.includes('name')) return 'Display name of the entity';
    if (name.includes('status')) return 'Current status of the record';
    if (name.includes('type')) return 'Type or category of the entity';
    if (name.includes('active') || name.includes('enabled')) return 'Whether the record is active';
    if (name.includes('deleted')) return 'Soft delete flag';
    
    return `Field for ${field.name.replace(/([A-Z])/g, ' $1').toLowerCase().trim()}`;
  }

  private toSnakeCase(str: string): string {
    return str
      .replace(/([A-Z])/g, '_$1')
      .replace(/^_/, '')
      .toLowerCase();
  }

  private generateVersion(content: string): string {
    // Simple hash based on content length and first few characters
    const hash = content.length.toString() + content.substring(0, 10).replace(/\s/g, '');
    return `1.0.${hash.substring(0, 8)}`;
  }
}