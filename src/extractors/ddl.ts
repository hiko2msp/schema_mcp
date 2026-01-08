import type { TableMetadata } from '../core/types.js';
import { BaseExtractor } from './base.js';
import type { ExtractorResult } from '../core/types.js';
import { readFileSync } from 'fs';

export class DDLExtractor extends BaseExtractor {
  async extract(): Promise<ExtractorResult> {
    const content = readFileSync(this.config.path, 'utf-8');
    const tables = this.parseDDL(content);

    return {
      tables,
      version: this.generateVersion(content),
    };
  }

  private parseDDL(content: string): TableMetadata[] {
    const tables: TableMetadata[] = [];
    const createTableRegex =
      /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["`']?(\w+)["`']?\s*\(([\s\S]*?)\);/gi;
    let match;

    while ((match = createTableRegex.exec(content)) !== null) {
      const tableName = match[1];
      const tableBody = match[2];
      const columns = this.parseColumns(tableBody);
      const foreignKeys = this.parseForeignKeys(tableBody);

      tables.push({
        name: tableName,
        schema: 'public',
        description: this.inferTableDescription(tableName, columns, foreignKeys),
        source: 'inferred',
        confidence: 0.5,
        columns: columns.map(col => ({
          ...col,
          foreignKey: foreignKeys[col.name],
          description: this.inferColumnDescription(col, foreignKeys[col.name]),
          source: 'inferred' as const,
          confidence: 0.5,
        })),
      });
    }

    return tables;
  }

  private inferTableDescription(
    tableName: string,
    _columns: Array<{ name: string; type: string }>,
    _foreignKeys: Record<string, { table: string; column: string }>
  ): string {
    const name = tableName.toLowerCase();
    const words = name.split(/[_\s]+/).filter(w => w.length > 0);

    if (name.includes('user') && name.includes('click')) {
      return 'Stores user click tracking data';
    }

    if (name.includes('user') && name.includes('session')) {
      return 'Stores user session information';
    }

    if (name.includes('order') && name.includes('item')) {
      return 'Stores items in orders';
    }

    if (name.includes('product') && name.includes('category')) {
      return 'Stores product category information';
    }

    if (name.endsWith('s') || name.endsWith('es')) {
      const singular = name.replace(/s$/, '').replace(/es$/, '');
      return `Stores ${singular} records`;
    }

    return `Stores data for ${words.join(' ')}`;
  }

  private inferColumnDescription(
    column: { name: string; type: string },
    foreignKey: { table: string; column: string } | undefined
  ): string {
    const name = column.name.toLowerCase();
    const type = column.type.toUpperCase();

    if (name === 'id') {
      return 'Primary key identifier';
    }

    if (name.endsWith('_id')) {
      const entity = name.replace('_id', '');
      if (foreignKey) {
        return `Foreign key referencing ${foreignKey.table} table`;
      }
      return `Unique identifier of the ${entity}`;
    }

    if (name === 'created_at' || name === 'created') {
      return 'Timestamp when the record was created';
    }

    if (name === 'updated_at' || name === 'modified_at' || name === 'updated') {
      return 'Timestamp of last update';
    }

    if (name === 'deleted_at' || name === 'archived_at') {
      return 'Timestamp when the record was soft deleted or archived';
    }

    if (name === 'email') {
      return 'Email address';
    }

    if (name === 'name') {
      return 'Name';
    }

    if (name === 'status' || name === 'state') {
      return 'Current status or state';
    }

    if (name.includes('count') || name.includes('amount') || name.includes('quantity')) {
      return `Count or amount of ${name.replace(/_(count|amount|quantity)/, '')}`;
    }

    if (name.includes('is_') || name.includes('has_')) {
      const condition = name.replace(/^(is_|has_)/, '').replace(/_/g, ' ');
      return `Flag indicating if ${condition}`;
    }

    if (name.includes('active') || name.includes('enabled')) {
      return 'Flag indicating whether the record is active or enabled';
    }

    if (type.includes('TIMESTAMP') || type.includes('DATETIME') || type.includes('DATE')) {
      return `Timestamp for ${name.replace(/_/g, ' ')}`;
    }

    if (type.includes('TEXT') || type.includes('VARCHAR') || type.includes('CHAR')) {
      return `Text value for ${name.replace(/_/g, ' ')}`;
    }

    if (type.includes('INTEGER') || type.includes('NUMERIC') || type.includes('DECIMAL')) {
      return `Numeric value for ${name.replace(/_/g, ' ')}`;
    }

    return `Value for ${name.replace(/_/g, ' ')}`;
  }

  private parseColumns(
    tableBody: string
  ): Array<{ name: string; type: string; nullable: boolean; primaryKey: boolean }> {
    const columns: Array<{ name: string; type: string; nullable: boolean; primaryKey: boolean }> =
      [];

    const primaryKeyRegex = /PRIMARY\s+KEY\s*\(([^)]+)\)/i;
    const pkMatch = tableBody.match(primaryKeyRegex);
    const pkColumns = pkMatch
      ? pkMatch[1].split(',').map(c => c.trim().replace(/[`'""]/g, ''))
      : [];

    const lines = tableBody.split(',').map(line => line.trim());

    for (const line of lines) {
      if (
        line.toUpperCase().includes('FOREIGN KEY') ||
        line.toUpperCase().startsWith('CONSTRAINT') ||
        line.toUpperCase().startsWith('PRIMARY KEY')
      ) {
        continue;
      }

      const columnRegex = /^["`']?(\w+)["`']?\s+(\w+(?:\([^)]+\))?)/;
      const match = line.match(columnRegex);

      if (match) {
        const isPrimaryKey =
          pkColumns.includes(match[1]) || line.toUpperCase().includes('PRIMARY KEY');

        columns.push({
          name: match[1],
          type: match[2],
          nullable: !line.toUpperCase().includes('NOT NULL'),
          primaryKey: isPrimaryKey,
        });
      }
    }

    return columns;
  }

  private parseForeignKeys(tableBody: string): Record<string, { table: string; column: string }> {
    const foreignKeys: Record<string, { table: string; column: string }> = {};
    const fkRegex =
      /FOREIGN\s+KEY\s*\(["`']?(\w+)["`']?\)\s*REFERENCES\s+["`']?(\w+)["`']?\s*\(["`']?(\w+)["`']?\)/gi;
    let match;

    while ((match = fkRegex.exec(tableBody)) !== null) {
      foreignKeys[match[1]] = {
        table: match[2],
        column: match[3],
      };
    }

    return foreignKeys;
  }

  private generateVersion(content: string): string {
    return Buffer.from(content).toString('base64').slice(0, 16);
  }
}
