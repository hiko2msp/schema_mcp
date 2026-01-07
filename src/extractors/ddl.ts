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
        description: '',
        source: 'inferred',
        confidence: 0.5,
        columns: columns.map(col => ({
          ...col,
          foreignKey: foreignKeys[col.name],
          description: '',
          source: 'inferred' as const,
          confidence: 0.5,
        })),
      });
    }

    return tables;
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
