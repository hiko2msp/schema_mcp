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

  sanitize(name: string): string {
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      throw new Error(
        `Invalid catalog name: "${name}". Only alphanumeric characters, hyphens, and underscores are allowed.`
      );
    }
    return name;
  }

  private _sanitizeHTML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private _unsanitizeHTML(text: string): string {
    if (!text) return '';
    return text
      .replace(/&#039;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&gt;/g, '>')
      .replace(/&lt;/g, '<')
      .replace(/&amp;/g, '&');
  }

  async save(catalog: string, metadata: SchemaMetadata): Promise<void> {
    const sanitizedCatalog = this.sanitize(catalog);
    const catalogDir = join(this.metadataPath, sanitizedCatalog);
    const filePath = join(catalogDir, 'metadata.yaml');

    // Sanitize descriptions before saving
    const sanitizedMetadata = {
      ...metadata,
      tables: metadata.tables.map(table => ({
        ...table,
        description: table.description ? this._sanitizeHTML(table.description) : '',
        columns: table.columns.map(column => ({
          ...column,
          description: column.description ? this._sanitizeHTML(column.description) : '',
        })),
      })),
    };

    await mkdir(catalogDir, { recursive: true });
    await writeFile(filePath, yaml.stringify(sanitizedMetadata), 'utf-8');
  }

  async load(catalog: string): Promise<SchemaMetadata | null> {
    const sanitizedCatalog = this.sanitize(catalog);
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
    const sanitizedCatalog = this.sanitize(catalog);
    const metadata = await this.load(sanitizedCatalog);
    if (!metadata) {
      throw new Error(`Catalog ${sanitizedCatalog} not found`);
    }

    const tableIndex = metadata.tables.findIndex(t => t.name === tableName);
    if (tableIndex === -1) {
      throw new Error(`Table ${tableName} not found`);
    }

    // To prevent data corruption from double-sanitization, we need to
    // unsanitize the existing data, apply the raw updates, and then let
    // the save() method perform a clean sanitization pass.
    const rawMetadata = {
      ...metadata,
      tables: metadata.tables.map(table => ({
        ...table,
        description: this._unsanitizeHTML(table.description),
        columns: table.columns.map(column => ({
          ...column,
          description: this._unsanitizeHTML(column.description),
        })),
      })),
    };

    rawMetadata.tables[tableIndex] = {
      ...rawMetadata.tables[tableIndex],
      ...updates,
      source: 'overridden',
    };

    await this.save(sanitizedCatalog, rawMetadata);
  }

  async searchTables(catalog: string, query: string): Promise<TableMetadata[]> {
    const sanitizedCatalog = this.sanitize(catalog);
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
