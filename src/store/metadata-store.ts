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

  private _unescapeHTML(text: string | undefined | null): string {
    if (!text) return '';
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&apos;/g, "'");
  }

  private _escapeHTML(text: string | undefined | null): string {
    if (!text) return '';
    // Unescape first to ensure we don't double-escape already sanitized content
    const unescaped = this._unescapeHTML(text);
    return unescaped
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  async save(catalog: string, metadata: SchemaMetadata): Promise<void> {
    const sanitizedCatalog = this.sanitize(catalog);
    const catalogDir = join(this.metadataPath, sanitizedCatalog);
    const filePath = join(catalogDir, 'metadata.yaml');

    // Sanitize descriptions before saving (both table and column level)
    const sanitizedMetadata = {
      ...metadata,
      tables: metadata.tables.map(table => ({
        ...table,
        description: this._escapeHTML(table.description),
        columns: table.columns.map(col => ({
          ...col,
          description: this._escapeHTML(col.description),
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

    metadata.tables[tableIndex] = {
      ...metadata.tables[tableIndex],
      ...updates,
      source: 'overridden',
    };

    await this.save(sanitizedCatalog, metadata);
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

    return metadata.tables.filter(table => {
      const tableDesc = this._unescapeHTML(table.description).toLowerCase();
      const matchesTable = table.name.toLowerCase().includes(lowerQuery) || tableDesc.includes(lowerQuery);

      if (matchesTable) return true;

      return table.columns.some(col => {
        const colDesc = this._unescapeHTML(col.description).toLowerCase();
        return col.name.toLowerCase().includes(lowerQuery) || colDesc.includes(lowerQuery);
      });
    });
  }
}
