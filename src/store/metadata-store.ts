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

  private _sanitizeHTML(t: string): string {
    return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  private _unsanitizeHTML(t: string): string {
    return t.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, '&');
  }

  private _sanitizeTable(t: TableMetadata): TableMetadata {
    return { ...t, description: this._sanitizeHTML(t.description || ''),
      columns: t.columns.map(c => ({ ...c, description: this._sanitizeHTML(c.description || '') })) };
  }

  private _unsanitizeTable(t: TableMetadata): TableMetadata {
    return { ...t, description: this._unsanitizeHTML(t.description || ''),
      columns: t.columns.map(c => ({ ...c, description: this._unsanitizeHTML(c.description || '') })) };
  }

  async save(catalog: string, metadata: SchemaMetadata): Promise<void> {
    const sanitizedCatalog = this.sanitize(catalog);
    const catalogDir = join(this.metadataPath, sanitizedCatalog);
    const filePath = join(catalogDir, 'metadata.yaml');

    // Sanitize descriptions before saving
    const sanitizedMetadata = {
      ...metadata,
      tables: metadata.tables.map(table => this._sanitizeTable(table)),
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

  async updateTableMetadata(catalog: string, tableName: string, updates: Partial<TableMetadata>): Promise<void> {
    const sanitizedCatalog = this.sanitize(catalog);
    const metadata = await this.load(sanitizedCatalog);
    if (!metadata) throw new Error(`Catalog ${sanitizedCatalog} not found`);

    const rawMetadata: SchemaMetadata = { ...metadata, tables: metadata.tables.map(t => this._unsanitizeTable(t)) };
    const idx = rawMetadata.tables.findIndex(t => t.name === tableName);
    if (idx === -1) throw new Error(`Table ${tableName} not found`);

    rawMetadata.tables[idx] = { ...rawMetadata.tables[idx], ...updates, source: 'overridden' };
    await this.save(sanitizedCatalog, rawMetadata);
  }

  async searchTables(catalog: string, query: string): Promise<TableMetadata[]> {
    const sanitizedCatalog = this.sanitize(catalog);
    const metadata = await this.load(sanitizedCatalog);
    if (!metadata || !query?.trim()) return [];

    const lowerQuery = query.toLowerCase();
    return metadata.tables.filter(t => {
      const raw = this._unsanitizeTable(t);
      return raw.name.toLowerCase().includes(lowerQuery) || raw.description.toLowerCase().includes(lowerQuery) ||
        raw.columns.some(c => c.name.toLowerCase().includes(lowerQuery) || c.description.toLowerCase().includes(lowerQuery));
    });
  }
}
