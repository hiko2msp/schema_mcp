import type { SchemaMetadata, TableMetadata } from '../core/types.js';

export class ERDiagramGenerator {
  /**
   * Generate Mermaid ER diagram from schema metadata
   */
  generateERDiagram(metadata: SchemaMetadata): string {
    const tables = metadata.tables;
    
    // Start with erDiagram declaration
    let diagram = 'erDiagram\n';
    
    // Add table definitions
    for (const table of tables) {
      diagram += this.generateTableDefinition(table);
    }
    
    // Add relationships
    diagram += this.generateRelationships(tables);
    
    return diagram;
  }

  /**
   * Generate Mermaid table definition
   */
  private generateTableDefinition(table: TableMetadata): string {
    const tableName = table.name;
    let definition = `    ${tableName} {\n`;
    
    for (const column of table.columns) {
      const columnType = this.mapToMermaidType(column.type);
      const columnModifiers = [];
      
      if (column.primaryKey) {
        columnModifiers.push('PK');
      }
      
      if (column.nullable) {
        columnModifiers.push('NULL');
      } else {
        columnModifiers.push('NOT NULL');
      }
      
      const modifiersStr = columnModifiers.length > 0 ? ` "${columnModifiers.join(', ')}"` : '';
      definition += `        ${column.name} ${columnType}${modifiersStr}\n`;
    }
    
    definition += '    }\n';
    return definition;
  }

  /**
   * Generate relationships between tables
   */
  private generateRelationships(tables: TableMetadata[]): string {
    let relationships = '';
    
    for (const table of tables) {
      for (const column of table.columns) {
        if (column.foreignKey) {
          const sourceTable = table.name;
          const sourceColumn = column.name;
          const targetTable = column.foreignKey.table;
          const targetColumn = column.foreignKey.column;
          
          // Mermaid relationship syntax: TABLE_A ||--o{ TABLE_B : "relationship"
          const relationship = `    ${targetTable} ||--o{ ${sourceTable} : "${sourceColumn} -> ${targetColumn}"\n`;
          relationships += relationship;
        }
      }
    }
    
    return relationships;
  }

  /**
   * Map SQL types to Mermaid types
   */
  private mapToMermaidType(sqlType: string): string {
    const typeMap: Record<string, string> = {
      'INTEGER': 'int',
      'BIGINT': 'int',
      'SMALLINT': 'int',
      'TINYINT': 'int',
      'VARCHAR': 'varchar',
      'CHAR': 'varchar',
      'TEXT': 'text',
      'LONGTEXT': 'text',
      'BOOLEAN': 'bool',
      'TIMESTAMP': 'datetime',
      'DATETIME': 'datetime',
      'DATE': 'date',
      'TIME': 'time',
      'DECIMAL': 'decimal',
      'NUMERIC': 'decimal',
      'FLOAT': 'float',
      'DOUBLE': 'float',
      'JSON': 'json',
      'JSONB': 'json',
      'UUID': 'varchar',
      'BLOB': 'blob',
      'BYTEA': 'blob',
    };
    
    // Extract base type (remove size constraints, etc.)
    const baseType = sqlType.toUpperCase().split('(')[0].trim();
    return typeMap[baseType] || 'varchar';
  }

  /**
   * Generate Mermaid graph with enhanced styling
   */
  generateStyledERDiagram(metadata: SchemaMetadata): string {
    let diagram = 'graph LR\n';
    diagram += '    %% Mermaid ER Diagram for Schema Metadata\n';
    diagram += '    %% Generated automatically from schema metadata\n\n';
    
    // Define table nodes
    for (const table of metadata.tables) {
      diagram += `    subgraph ${table.name} [${table.name}]\n`;
      
      for (const column of table.columns) {
        const columnId = `${table.name}_${column.name}`;
        const label = `${column.name}: ${this.mapToMermaidType(column.type)}`;
        
        if (column.primaryKey) {
          diagram += `        ${columnId}[🔑 ${label}]\n`;
        } else if (column.foreignKey) {
          diagram += `        ${columnId}[🔗 ${label}]\n`;
        } else if (column.nullable) {
          diagram += `        ${columnId}[○ ${label}]\n`;
        } else {
          diagram += `        ${columnId}[● ${label}]\n`;
        }
      }
      
      diagram += '    end\n\n';
    }
    
    // Define relationships
    for (const table of metadata.tables) {
      for (const column of table.columns) {
        if (column.foreignKey) {
          const sourceId = `${table.name}_${column.name}`;
          const targetId = `${column.foreignKey.table}_${column.foreignKey.column}`;
          diagram += `    ${targetId} --> ${sourceId}\n`;
        }
      }
    }
    
    // Add styling
    diagram += '\n    %% Styling\n';
    diagram += '    classDef pk fill:#ff9999,stroke:#333,stroke-width:2px\n';
    diagram += '    classDef fk fill:#99ccff,stroke:#333,stroke-width:2px\n';
    diagram += '    classDef nullable fill:#f9f9f9,stroke:#999,stroke-width:1px\n';
    diagram += '    classDef required fill:#fff,stroke:#333,stroke-width:2px\n';
    
    return diagram;
  }

  /**
   * Generate simplified ER diagram focusing on relationships
   */
  generateRelationshipDiagram(metadata: SchemaMetadata): string {
    let diagram = 'graph TD\n';
    diagram += '    %% Relationship-focused ER Diagram\n\n';
    
    // Create table nodes with simple labels
    for (const table of metadata.tables) {
      const description = table.description.split('.')[0]; // Take first sentence
      diagram += `    ${table.name}["${table.name}<br><small>${description}</small>"]\n`;
    }
    
    // Add relationships with cardinality
    const addedRelationships = new Set<string>();
    
    for (const table of metadata.tables) {
      for (const column of table.columns) {
        if (column.foreignKey) {
          const sourceTable = table.name;
          const targetTable = column.foreignKey.table;
          
          // Create unique relationship identifier to avoid duplicates
          const relationshipId = `${targetTable}_${sourceTable}`;
          
          if (!addedRelationships.has(relationshipId)) {
            diagram += `    ${targetTable} --> ${sourceTable}\n`;
            addedRelationships.add(relationshipId);
          }
        }
      }
    }
    
    return diagram;
  }

  /**
   * Generate complete documentation with diagrams
   */
  generateDocumentation(metadata: SchemaMetadata): string {
    let doc = `# Schema Documentation: ${metadata.catalog}\n\n`;
    doc += `Generated: ${metadata.lastUpdated}\n`;
    doc += `Version: ${metadata.version}\n\n`;
    
    // Summary
    doc += '## Summary\n\n';
    doc += `- **Tables**: ${metadata.tables.length}\n`;
    const totalColumns = metadata.tables.reduce((sum, table) => sum + table.columns.length, 0);
    doc += `- **Columns**: ${totalColumns}\n`;
    const relationshipCount = metadata.tables.reduce((sum, table) => 
      sum + table.columns.filter(col => col.foreignKey).length, 0
    );
    doc += `- **Relationships**: ${relationshipCount}\n\n`;
    
    // ER Diagram
    doc += '## Entity Relationship Diagram\n\n';
    doc += '```mermaid\n';
    doc += this.generateERDiagram(metadata);
    doc += '\n```\n\n';
    
    // Relationship-focused diagram
    doc += '## Relationship Overview\n\n';
    doc += '```mermaid\n';
    doc += this.generateRelationshipDiagram(metadata);
    doc += '\n```\n\n';
    
    // Table details
    doc += '## Table Details\n\n';
    for (const table of metadata.tables) {
      doc += `### ${table.name}\n\n`;
      doc += `${table.description}\n\n`;
      doc += `**Schema**: ${table.schema}\n`;
      doc += `**Source**: ${table.source}\n`;
      doc += `**Confidence**: ${table.confidence}\n\n`;
      
      doc += '| Column | Type | Nullable | Primary Key | Foreign Key | Description |\n';
      doc += '|--------|------|----------|-------------|-------------|-------------|\n';
      
      for (const column of table.columns) {
        const foreignKey = column.foreignKey 
          ? `${column.foreignKey.table}.${column.foreignKey.column}`
          : '-';
        
        doc += `| ${column.name} | ${column.type} | ${column.nullable ? 'Yes' : 'No'} | ${column.primaryKey ? 'Yes' : 'No'} | ${foreignKey} | ${column.description} |\n`;
      }
      
      doc += '\n';
    }
    
    return doc;
  }
}