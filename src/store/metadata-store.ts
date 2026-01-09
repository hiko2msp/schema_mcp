import type { SchemaMetadata, TableMetadata } from '../core/types.js';
import { readFile, writeFile, mkdir, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import * as yaml from 'yaml';

export class MetadataStore {
  private metadataPath: string;

  constructor(storePath: string = './.schema_mcp') {
    this.metadataPath = storePath;
  }

  private _sanitize(name: string): string {
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      throw new Error(
        `Invalid catalog name: "${name}". Only alphanumeric characters, hyphens, and underscores are allowed.`
      );
    }
    return name;
  }

  async save(catalog: string, metadata: SchemaMetadata): Promise<void> {
    const sanitizedCatalog = this._sanitize(catalog);
    const catalogDir = join(this.metadataPath, sanitizedCatalog);
    const filePath = join(catalogDir, 'metadata.yaml');

    await mkdir(catalogDir, { recursive: true });
    await writeFile(filePath, yaml.stringify(metadata), 'utf-8');
  }

  async load(catalog: string): Promise<SchemaMetadata | null> {
    const sanitizedCatalog = this._sanitize(catalog);
    const catalogDir = join(this.metadataPath, sanitizedCatalog);
    const filePath = join(catalogDir, 'metadata.yaml');

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

    const entries = await readdir(this.metadataPath, { withFileTypes: true });
    const catalogs: string[] = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const catalogPath = join(this.metadataPath, entry.name);
        const metadataFilePath = join(catalogPath, 'metadata.yaml');

        if (existsSync(metadataFilePath)) {
          catalogs.push(entry.name);
        }
      }
    }

    return catalogs;
  }

  async updateTableMetadata(
    catalog: string,
    tableName: string,
    updates: Partial<TableMetadata>
  ): Promise<void> {
    const sanitizedCatalog = this._sanitize(catalog);
    const metadata = await this.load(sanitizedCatalog);
    if (!metadata) {
      throw new Error(`Catalog ${sanitizedCatalog} not found`);
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

    await this.save(sanitizedCatalog, metadata);
  }

  async searchTables(catalog: string, query: string): Promise<TableMetadata[]> {
    const sanitizedCatalog = this._sanitize(catalog);
    const metadata = await this.load(sanitizedCatalog);
    if (!metadata) {
      return [];
    }

    if (!query || query.trim() === '') {
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
