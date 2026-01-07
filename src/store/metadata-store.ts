import type { SchemaMetadata, TableMetadata } from '../core/types.js';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import * as yaml from 'yaml';

export class MetadataStore {
  private metadataPath: string;

  constructor(storePath: string = './metadata') {
    this.metadataPath = storePath;
  }

  async save(catalog: string, metadata: SchemaMetadata): Promise<void> {
    const filePath = join(this.metadataPath, `${catalog}.yaml`);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, yaml.stringify(metadata), 'utf-8');
  }

  async load(catalog: string): Promise<SchemaMetadata | null> {
    const filePath = join(this.metadataPath, `${catalog}.yaml`);

    if (!existsSync(filePath)) {
      return null;
    }

    const content = await readFile(filePath, 'utf-8');
    return yaml.parse(content) as SchemaMetadata;
  }

  async listCatalogs(): Promise<string[]> {
    if (!existsSync(this.metadataPath)) {
      return [];
    }

    // This would need fs.readdir - simplified for now
    return ['default'];
  }

  async updateTableMetadata(
    catalog: string,
    tableName: string,
    updates: Partial<TableMetadata>
  ): Promise<void> {
    const metadata = await this.load(catalog);
    if (!metadata) {
      throw new Error(`Catalog ${catalog} not found`);
    }

    const tableIndex = metadata.tables.findIndex(t => t.name === tableName);
    if (tableIndex === -1) {
      throw new Error(`Table ${tableName} not found`);
    }

    metadata.tables[tableIndex] = {
      ...metadata.tables[tableIndex],
      ...updates,
      source: 'overridden',
    };

    await this.save(catalog, metadata);
  }

  async searchTables(catalog: string, query: string): Promise<TableMetadata[]> {
    const metadata = await this.load(catalog);
    if (!metadata) {
      return [];
    }

    const lowerQuery = query.toLowerCase();

    return metadata.tables.filter(
      table =>
        table.name.toLowerCase().includes(lowerQuery) ||
        table.description.toLowerCase().includes(lowerQuery) ||
        table.columns.some(
          col =>
            col.name.toLowerCase().includes(lowerQuery) ||
            col.description.toLowerCase().includes(lowerQuery)
        )
    );
  }
}
