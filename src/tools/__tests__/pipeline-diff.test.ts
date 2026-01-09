import { describe, it, expect, beforeEach } from 'vitest';
import { Pipeline } from '../pipeline.js';
import { MetadataStore } from '../../store/index.js';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import type { ExtractorConfig, TableMetadata } from '../../core/types.js';

// Mock extractor for testing
class MockExtractor {
  constructor(private tables: TableMetadata[]) {}

  async extract() {
    return {
      tables: this.tables,
      version: '1.0.0',
    };
  }
}

describe('Pipeline', () => {
  let pipeline: Pipeline;
  let tempDir: string;
  let store: MetadataStore;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `schema-mcp-test-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    
    store = new MetadataStore(tempDir);
    pipeline = new Pipeline(tempDir);
  });

  describe('diff calculation', () => {
    it('should detect added tables', async () => {
      const newTable: TableMetadata = {
        name: 'new_table',
        schema: 'public',
        description: 'A new table',
        source: 'inferred',
        confidence: 0.8,
        columns: [],
      };

      // Override the createExtractor method for testing
      (pipeline as any).createExtractor = () => new MockExtractor([newTable]);

      await pipeline.run('test', [{ type: 'ddl', path: 'dummy.sql' }]);

      const metadata = await store.load('test');
      expect(metadata?.tables).toHaveLength(1);
      expect(metadata?.tables[0].name).toBe('new_table');
    });

    it('should detect modified tables', async () => {
      const originalTable: TableMetadata = {
        name: 'users',
        schema: 'public',
        description: 'User table',
        source: 'inferred',
        confidence: 0.8,
        columns: [
          {
            name: 'id',
            type: 'INTEGER',
            nullable: false,
            primaryKey: true,
            description: 'Primary key',
            source: 'inferred',
            confidence: 0.9,
          },
        ],
      };

      // Save initial state
      await store.save('test', {
        catalog: 'test',
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        tables: [originalTable],
      });

      // Modified table with additional column
      const modifiedTable: TableMetadata = {
        ...originalTable,
        columns: [
          ...originalTable.columns,
          {
            name: 'email',
            type: 'VARCHAR',
            nullable: false,
            primaryKey: false,
            description: 'Email address',
            source: 'inferred',
            confidence: 0.9,
          },
        ],
      };

      (pipeline as any).createExtractor = () => new MockExtractor([modifiedTable]);

      await pipeline.run('test', [{ type: 'ddl', path: 'dummy.sql' }]);

      const metadata = await store.load('test');
      expect(metadata?.tables).toHaveLength(1);
      expect(metadata?.tables[0].columns).toHaveLength(2);
      expect(metadata?.tables[0].columns.map(c => c.name)).toContain('email');
    });

    it('should preserve human-provided descriptions', async () => {
      const humanTable: TableMetadata = {
        name: 'users',
        schema: 'public',
        description: 'Custom human description',
        source: 'human',
        confidence: 1.0,
        columns: [
          {
            name: 'id',
            type: 'INTEGER',
            nullable: false,
            primaryKey: true,
            description: 'Custom column description',
            source: 'human',
            confidence: 1.0,
          },
        ],
      };

      // Save initial state with human descriptions
      await store.save('test', {
        catalog: 'test',
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        tables: [humanTable],
      });

      // Simulate re-extraction with different descriptions
      const extractedTable: TableMetadata = {
        name: 'users',
        schema: 'public',
        description: 'Generic inferred description',
        source: 'inferred',
        confidence: 0.7,
        columns: [
          {
            name: 'id',
            type: 'INTEGER',
            nullable: false,
            primaryKey: true,
            description: 'Generic column description',
            source: 'inferred',
            confidence: 0.7,
          },
        ],
      };

      (pipeline as any).createExtractor = () => new MockExtractor([extractedTable]);

      await pipeline.run('test', [{ type: 'ddl', path: 'dummy.sql' }]);

      const metadata = await store.load('test');
      expect(metadata?.tables[0].description).toBe('Custom human description');
      expect(metadata?.tables[0].source).toBe('human');
      expect(metadata?.tables[0].columns[0].description).toBe('Custom column description');
      expect(metadata?.tables[0].columns[0].source).toBe('human');
    });

    it('should detect removed tables', async () => {
      const table1: TableMetadata = {
        name: 'users',
        schema: 'public',
        description: 'User table',
        source: 'inferred',
        confidence: 0.8,
        columns: [],
      };

      const table2: TableMetadata = {
        name: 'posts',
        schema: 'public',
        description: 'Post table',
        source: 'inferred',
        confidence: 0.8,
        columns: [],
      };

      // Save initial state with two tables
      await store.save('test', {
        catalog: 'test',
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        tables: [table1, table2],
      });

      // Extract only one table (simulating removal of the other)
      (pipeline as any).createExtractor = () => new MockExtractor([table1]);

      await pipeline.run('test', [{ type: 'ddl', path: 'dummy.sql' }]);

      const metadata = await store.load('test');
      expect(metadata?.tables).toHaveLength(1);
      expect(metadata?.tables[0].name).toBe('users');
    });

    it('should handle structural changes correctly', async () => {
      const originalTable: TableMetadata = {
        name: 'users',
        schema: 'public',
        description: 'User table',
        source: 'inferred',
        confidence: 0.8,
        columns: [
          {
            name: 'id',
            type: 'INTEGER',
            nullable: false,
            primaryKey: true,
            description: 'Primary key',
            source: 'inferred',
            confidence: 0.9,
          },
        ],
      };

      // Save initial state
      await store.save('test', {
        catalog: 'test',
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        tables: [originalTable],
      });

      // Modified table with changed type
      const modifiedTable: TableMetadata = {
        ...originalTable,
        columns: [
          {
            ...originalTable.columns[0],
            type: 'BIGINT', // Changed type
          },
        ],
      };

      (pipeline as any).createExtractor = () => new MockExtractor([modifiedTable]);

      await pipeline.run('test', [{ type: 'ddl', path: 'dummy.sql' }]);

      const metadata = await store.load('test');
      expect(metadata?.tables[0].columns[0].type).toBe('BIGINT');
    });
  });
});