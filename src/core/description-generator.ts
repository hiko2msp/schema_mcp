import type { TableMetadata, ColumnMetadata } from './types.js';

export interface DescriptionInference {
  description: string;
  assumptions: string[];
  confidence: number;
  source: 'inferred';
}

export class DescriptionGenerator {
  /**
   * Generate description for a table based on its name, columns, and relationships
   */
  generateTableDescription(table: TableMetadata): DescriptionInference {
    const tableName = table.name.toLowerCase();
    const assumptions: string[] = [];
    let confidence = 0.7;
    let description = '';

    // Check for junction table patterns first
    if (tableName.includes('join') || tableName.includes('mapping') || tableName.includes('link')) {
      description = 'Junction table for many-to-many relationships';
      confidence = 0.7;
      assumptions.push('Assumed to be a junction table based on naming pattern');
    } else if (tableName.includes('user')) {
      description = 'Stores user account information and authentication data';
      confidence = 0.9;
    } else if (tableName.includes('order')) {
      description = 'Contains order data, purchase details, and transaction information';
      confidence = 0.9;
    } else if (tableName.includes('product')) {
      description = 'Product catalog with pricing, inventory, and categorization data';
      confidence = 0.9;
    } else if (tableName.includes('category')) {
      description = 'Product categories and hierarchical classification system';
      confidence = 0.8;
    } else if (tableName.includes('payment')) {
      description = 'Payment transaction records and financial processing data';
      confidence = 0.8;
    } else if (tableName.includes('session')) {
      description = 'User session management and authentication state data';
      confidence = 0.8;
    } else if (tableName.includes('log') || tableName.includes('audit')) {
      description = 'System logs, audit trail, and activity tracking records';
      confidence = 0.8;
    } else if (tableName.includes('setting') || tableName.includes('config')) {
      description = 'System configuration, settings, and preference data';
      confidence = 0.8;
    } else if (tableName.includes('role') || tableName.includes('permission')) {
      description = 'User roles, permissions, and access control definitions';
      confidence = 0.8;
    } else {
      // Generic description based on table name
      description = `Table for ${tableName.replace(/_/g, ' ')} data`;
      confidence = 0.5;
      assumptions.push('Generic description based on table name only');
    }

    // Analyze column patterns to refine description
    const hasTimestamps = table.columns.some(c => c.name.includes('created_at') || c.name.includes('updated_at'));
    const hasSoftDelete = table.columns.some(c => c.name.includes('deleted_at') || c.name.includes('is_deleted'));
    const hasForeignKeys = table.columns.some(c => c.foreignKey);

    if (hasTimestamps) {
      description += ' with automatic timestamp tracking';
    }

    if (hasSoftDelete) {
      description += ' supporting soft delete functionality';
      assumptions.push('Soft delete support inferred from column patterns');
    }

    if (hasForeignKeys) {
      const fkCount = table.columns.filter(c => c.foreignKey).length;
      description += ` with ${fkCount} foreign key relationship${fkCount > 1 ? 's' : ''}`;
    }

    return {
      description,
      assumptions,
      confidence,
      source: 'inferred',
    };
  }

  /**
   * Generate description for a column based on its name, type, and constraints
   */
  generateColumnDescription(column: ColumnMetadata, tableName: string): DescriptionInference {
    const columnName = column.name.toLowerCase();
    const columnType = column.type.toLowerCase();
    const assumptions: string[] = [];
    let confidence = 0.7;
    let description = '';

    // Timestamp patterns (check first as they're common)
    if (columnName.includes('created_at') || columnName.includes('created_on')) {
      description = 'Timestamp when record was initially created';
      confidence = 0.9;
    } else if (columnName.includes('updated_at') || columnName.includes('updated_on') || columnName.includes('modified_at')) {
      description = 'Timestamp when record was last updated';
      confidence = 0.9;
    } else if (columnName.includes('deleted_at') || columnName.includes('archived_at')) {
      description = 'Timestamp for soft delete or archival';
      confidence = 0.8;
    }
    // Contact information
    else if (columnName.includes('email')) {
      description = 'Email address used for user contact and communication';
      confidence = 0.9;
    } else if (columnName.includes('phone') || columnName.includes('mobile')) {
      description = 'Phone number for user contact';
      confidence = 0.8;
    }
    // Personal information
    else if (columnName.includes('first_name')) {
      description = 'First name of user or entity';
      confidence = 0.9;
    } else if (columnName.includes('last_name') || columnName.includes('surname')) {
      description = 'Last name or surname of user or entity';
      confidence = 0.9;
    } else if (columnName.includes('name') || columnName.includes('title')) {
      description = `Display name of the entity`;
      confidence = 0.8;
    }
    // Status and state
    else if (columnName.includes('status')) {
      description = 'Current status or state of record';
      confidence = 0.8;
      if (columnType.includes('varchar') || columnType.includes('enum')) {
        description += ' (e.g., active, inactive, pending)';
      }
    } else if (columnName.includes('active') || columnName.includes('enabled')) {
      description = 'Flag indicating whether record is active or enabled';
      confidence = 0.8;
    } else if (columnName.includes('is_') || columnName.startsWith('has_')) {
      description = `Boolean flag for ${columnName.replace(/^(is_|has_)/, '').replace(/_/g, ' ')}`;
      confidence = 0.7;
    }
    // Content and data
    else if (columnName.includes('content') || columnName.includes('body') || columnName.includes('text')) {
      description = 'Main content or body text of the entity';
      confidence = 0.8;
    } else if (columnName.includes('description') || columnName.includes('desc')) {
      description = 'Detailed description or explanatory text';
      confidence = 0.8;
    } else if (columnName.includes('summary')) {
      description = 'Brief summary or overview';
      confidence = 0.7;
    }
    // Metadata
    else if (columnName.includes('type') || columnName.includes('category')) {
      description = `Classification or ${columnName} of the entity`;
      confidence = 0.7;
    } else if (columnName.includes('priority')) {
      description = 'Priority level or importance ranking';
      confidence = 0.7;
    } else if (columnName.includes('sort') || columnName.includes('order')) {
      description = 'Sorting order or sequence number';
      confidence = 0.7;
    }
    // Financial
    else if (columnName.includes('price') || columnName.includes('cost') || columnName.includes('amount')) {
      description = `Monetary ${columnName} in the base currency`;
      confidence = 0.8;
      if (columnType.includes('decimal') || columnType.includes('numeric')) {
        description += ' with precise decimal precision';
      }
    } else if (columnName.includes('currency')) {
      description = 'Currency code or identifier';
      confidence = 0.8;
    }
    // Generic patterns
    else if (columnName.includes('url') || columnName.includes('link')) {
      description = 'URL or web link reference';
      confidence = 0.8;
    } else if (columnName.includes('image') || columnName.includes('photo') || columnName.includes('avatar')) {
      description = 'Image file path or URL';
      confidence = 0.7;
    } else if (columnName.includes('file') || columnName.includes('document')) {
      description = 'File path or document reference';
      confidence = 0.7;
    }
    // ID patterns (check last as they're more generic)
    else if (columnName.includes('id') && column.primaryKey) {
      description = `Primary key uniquely identifying ${tableName.replace(/_/g, ' ')}`;
      confidence = 0.9;
    } else if (columnName.includes('id') && column.foreignKey) {
      description = `Foreign key referencing ${column.foreignKey.table.replace(/_/g, ' ')}`;
      confidence = 0.9;
    } else if (columnName.includes('id')) {
      description = `Identifier field for the ${tableName.replace(/_/g, ' ')}`;
      confidence = 0.7;
    }
    // Fallback to generic description
    else {
      description = `Field for ${columnName.replace(/_/g, ' ')}`;
      confidence = 0.5;
      assumptions.push('Generic description based on column name only');
    }

    // Add type-specific information
    if (columnType.includes('timestamp') || columnType.includes('datetime')) {
      description += ' (timestamp)';
    } else if (columnType.includes('boolean')) {
      description += ' (boolean flag)';
    } else if (columnType.includes('json') || columnType.includes('jsonb')) {
      description += ' (structured JSON data)';
    }

    // Add nullable information
    if (column.nullable) {
      assumptions.push('Field is nullable - may contain null values');
    }

    return {
      description,
      assumptions,
      confidence,
      source: 'inferred',
    };
  }

  /**
   * Enhance existing table metadata with AI-generated descriptions
   */
  enhanceTableMetadata(table: TableMetadata): TableMetadata {
    // Only enhance if not already human-provided
    if (table.source === 'human' || table.source === 'overridden') {
      return table;
    }

    const inference = this.generateTableDescription(table);
    
    return {
      ...table,
      description: inference.description,
      confidence: inference.confidence,
      columns: table.columns.map(column => this.enhanceColumnMetadata(column, table.name)),
    };
  }

  /**
   * Enhance existing column metadata with AI-generated descriptions
   */
  enhanceColumnMetadata(column: ColumnMetadata, tableName: string): ColumnMetadata {
    // Only enhance if not already human-provided
    if (column.source === 'human' || column.source === 'overridden') {
      return column;
    }

    const inference = this.generateColumnDescription(column, tableName);
    
    return {
      ...column,
      description: inference.description,
      confidence: inference.confidence,
    };
  }
}