import { describe, it, expect, beforeEach } from 'vitest';
import { DDLExtractor } from '../ddl.js';
import type { ExtractorConfig } from '../../core/types.js';

describe('DDLExtractor', () => {
  it('should extract tables from DDL', async () => {
    const config: ExtractorConfig = {
      type: 'ddl',
      path: './example/schema.sql',
    };

    const extractor = new DDLExtractor(config);
    const result = await extractor.extract();

    expect(result.tables).toBeDefined();
    expect(result.tables.length).toBeGreaterThan(0);
  });

  it('should parse table names correctly', async () => {
    const config: ExtractorConfig = {
      type: 'ddl',
      path: './example/schema.sql',
    };

    const extractor = new DDLExtractor(config);
    const result = await extractor.extract();

    const tableNames = result.tables.map(t => t.name);
    expect(tableNames).toContain('users');
    expect(tableNames).toContain('orders');
    expect(tableNames).toContain('order_items');
  });

  it('should parse columns correctly', async () => {
    const config: ExtractorConfig = {
      type: 'ddl',
      path: './example/schema.sql',
    };

    const extractor = new DDLExtractor(config);
    const result = await extractor.extract();

    const usersTable = result.tables.find(t => t.name === 'users');
    expect(usersTable).toBeDefined();
    expect(usersTable?.columns.length).toBeGreaterThan(0);

    const idColumn = usersTable?.columns.find(c => c.name === 'id');
    expect(idColumn).toBeDefined();
    expect(idColumn?.primaryKey).toBe(true);
  });

  it('should detect foreign keys', async () => {
    const config: ExtractorConfig = {
      type: 'ddl',
      path: './example/schema.sql',
    };

    const extractor = new DDLExtractor(config);
    const result = await extractor.extract();

    const ordersTable = result.tables.find(t => t.name === 'orders');
    expect(ordersTable).toBeDefined();

    const userIdColumn = ordersTable?.columns.find(c => c.name === 'user_id');
    expect(userIdColumn?.foreignKey).toEqual({
      table: 'users',
      column: 'id',
    });
  });
});
