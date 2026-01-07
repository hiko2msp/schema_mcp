import type {
  ExtractorConfig,
  SchemaMetadata,
  TableMetadata,
  ExtractorResult,
} from '../core/types.js';
import { DDLExtractor } from '../extractors/ddl.js';
import { MetadataStore } from '../store/index.js';

export class Pipeline {
  private store: MetadataStore;

  constructor(storePath: string = './metadata') {
    this.store = new MetadataStore(storePath);
  }

  async run(catalog: string, extractors: ExtractorConfig[]): Promise<void> {
    let existing = await this.store.load(catalog);

    if (!existing) {
      existing = {
        catalog,
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        tables: [],
      };
    }

    for (const extractorConfig of extractors) {
      const extractor = this.createExtractor(extractorConfig);
      const result = await extractor.extract();

      this.mergeMetadata(existing, result);
    }

    existing.lastUpdated = new Date().toISOString();
    await this.store.save(catalog, existing);
  }

  private createExtractor(config: ExtractorConfig) {
    switch (config.type) {
      case 'ddl':
        return new DDLExtractor(config);
      default:
        throw new Error(`Unsupported extractor type: ${config.type}`);
    }
  }

  private mergeMetadata(metadata: SchemaMetadata, result: ExtractorResult): void {
    const existingTables = new Map(metadata.tables.map(t => [t.name, t]));

    for (const newTable of result.tables) {
      const existing = existingTables.get(newTable.name);

      if (existing) {
        this.mergeTable(existing, newTable);
      } else {
        metadata.tables.push(newTable);
      }
    }
  }

  private mergeTable(existing: TableMetadata, newTable: TableMetadata): void {
    if (existing.source !== 'human' && existing.source !== 'overridden') {
      existing.description = newTable.description;
      existing.source = newTable.source;
      existing.confidence = newTable.confidence;
    }

    const existingColumns = new Map(existing.columns.map(c => [c.name, c]));

    for (const newCol of newTable.columns) {
      const existingCol = existingColumns.get(newCol.name);

      if (existingCol) {
        if (existingCol.source !== 'human' && existingCol.source !== 'overridden') {
          existingCol.description = newCol.description;
          existingCol.source = newCol.source;
          existingCol.confidence = newCol.confidence;
        }
      } else {
        existing.columns.push(newCol);
      }
    }
  }
}
