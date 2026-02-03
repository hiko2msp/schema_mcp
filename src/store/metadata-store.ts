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

  private _s = (t: string | null | undefined) => (t || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  private _u = (t: string | null | undefined) => (t || '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'");

  async save(catalog: string, metadata: SchemaMetadata): Promise<void> {
    const sc = this.sanitize(catalog), dir = join(this.metadataPath, sc), filePath = join(dir, 'metadata.yaml');
    const sanitizedMetadata = {
      ...metadata,
      tables: metadata.tables.map(t => ({
        ...t,
        description: this._s(t.description),
        columns: t.columns.map(c => ({ ...c, description: this._s(c.description) })),
      })),
    };
    await mkdir(dir, { recursive: true });
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
    const sc = this.sanitize(catalog), m = await this.load(sc);
    if (!m) throw new Error(`Catalog ${sc} not found`);
    const tables = m.tables.map(t => ({ ...t, description: this._u(t.description), columns: t.columns.map(c => ({ ...c, description: this._u(c.description) })) }));
    const idx = tables.findIndex(t => t.name === tableName);
    if (idx === -1) throw new Error(`Table ${tableName} not found`);
    tables[idx] = { ...tables[idx], ...updates, source: 'overridden' };
    await this.save(sc, { ...m, tables });
  }

  async searchTables(catalog: string, query: string): Promise<TableMetadata[]> {
    const sc = this.sanitize(catalog), m = await this.load(sc);
    if (!m || !query?.trim()) return [];
    const q = query.toLowerCase();
    return m.tables.filter(t => t.name.toLowerCase().includes(q) || this._u(t.description).toLowerCase().includes(q) ||
        t.columns.some(c => c.name.toLowerCase().includes(q) || this._u(c.description).toLowerCase().includes(q)));
  }
}
