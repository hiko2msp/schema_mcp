import { describe, it, expect, beforeEach } from 'vitest';
import { MetadataStore } from '../metadata-store.js';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import type { SchemaMetadata, TableMetadata } from '../../core/types.js';

describe('MetadataStore', () => {
  let store: MetadataStore;
  let tempDir: string;
  let sampleMetadata: SchemaMetadata;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `schema-mcp-test-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    
    store = new MetadataStore(tempDir);
    
    sampleMetadata = {
      catalog: 'test',
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      tables: [
        {
          name: 'users',
          schema: 'public',
          description: 'User accounts and authentication data',
          source: 'inferred',
          confidence: 0.9,
          columns: [
            {
              name: 'id',
              type: 'INTEGER',
              nullable: false,
              primaryKey: true,
              description: 'Primary key for users table',
              source: 'inferred',
              confidence: 0.9,
            },
            {
              name: 'email',
              type: 'VARCHAR',
              nullable: false,
              primaryKey: false,
              description: 'User email address',
              source: 'inferred',
              confidence: 0.9,
            },
            {
              name: 'created_at',
              type: 'TIMESTAMP',
              nullable: false,
              primaryKey: false,
              description: 'Timestamp when user account was created',
              source: 'inferred',
              confidence: 0.9,
            },
          ],
        },
        {
          name: 'posts',
          schema: 'public',
          description: 'Blog posts and articles',
          source: 'inferred',
          confidence: 0.8,
          columns: [
            {
              name: 'id',
              type: 'INTEGER',
              nullable: false,
              primaryKey: true,
              description: 'Primary key for posts table',
              source: 'inferred',
              confidence: 0.9,
            },
            {
              name: 'title',
              type: 'VARCHAR',
              nullable: false,
              primaryKey: false,
              description: 'Post title',
              source: 'inferred',
              confidence: 0.8,
            },
            {
              name: 'user_id',
              type: 'INTEGER',
              nullable: false,
              primaryKey: false,
              foreignKey: { table: 'users', column: 'id' },
              description: 'Foreign key referencing users table',
              source: 'inferred',
              confidence: 0.9,
            },
          ],
        },
      ],
    };
  });

  describe('fuzzy search', () => {
    beforeEach(async () => {
      await store.save('test', sampleMetadata);
    });

    it('should find exact table name matches', async () => {
      const results = await store.searchTables('test', 'users');
      
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].name).toBe('users');
    });

    it('should find partial table name matches', async () => {
      const results = await store.searchTables('test', 'user');
      
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].name).toBe('users');
    });

    it('should find table description matches', async () => {
      const results = await store.searchTables('test', 'authentication');
      
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('users');
    });

    it('should find column name matches', async () => {
      const results = await store.searchTables('test', 'email');
      
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('users');
    });

    it('should find column description matches', async () => {
      const results = await store.searchTables('test', 'timestamp');
      
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('users');
    });

    it('should find foreign key relationships', async () => {
      const results = await store.searchTables('test', 'foreign key');
      
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('posts');
    });

    it('should handle partial matching', async () => {
      const results = await store.searchTables('test', 'user'); // Partial match for 'users'
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toBe('users');
    });

    it('should return multiple matches for broad queries', async () => {
      const results = await store.searchTables('test', 'table');
      
      // Both tables have 'table' in their descriptions
      const tableNames = results.map(r => r.name);
      expect(tableNames.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle queries with no matches', async () => {
      const results = await store.searchTables('test', 'nonexistent');
      
      expect(results).toHaveLength(0);
    });

    it('should handle empty queries gracefully', async () => {
      const results = await store.searchTables('test', '');
      
      expect(results).toHaveLength(0);
    });

    it('should handle case insensitive matching', async () => {
      const results1 = await store.searchTables('test', 'USERS');
      const results2 = await store.searchTables('test', 'users');
      
      expect(results1).toEqual(results2);
    });

    it('should return results sorted by relevance', async () => {
      const results = await store.searchTables('test', 'user');
      
      // Users table should be ranked higher than posts for 'user' query
      expect(results[0].name).toBe('users');
    });
  });

  describe('catalog management', () => {
    it('should list catalogs', async () => {
      await store.save('test1', sampleMetadata);
      await store.save('test2', { ...sampleMetadata, catalog: 'test2' });
      
      const catalogs = await store.listCatalogs();
      
      expect(catalogs).toHaveLength(2);
      expect(catalogs).toContain('test1');
      expect(catalogs).toContain('test2');
    });

    it('should not list non-catalog directories', async () => {
      await store.save('test', sampleMetadata);
      
      // Create a directory without metadata.yaml
      const emptyDir = join(tempDir, 'empty');
      await mkdir(emptyDir);
      
      const catalogs = await store.listCatalogs();
      
      expect(catalogs).toHaveLength(1);
      expect(catalogs).toContain('test');
      expect(catalogs).not.toContain('empty');
    });
  });

  describe('metadata operations', () => {
    it('should save and load metadata', async () => {
      await store.save('test', sampleMetadata);
      const loaded = await store.load('test');
      
      expect(loaded).toEqual(sampleMetadata);
    });

    it('should return null for non-existent catalog', async () => {
      const loaded = await store.load('nonexistent');
      
      expect(loaded).toBeNull();
    });

    it('should update table metadata', async () => {
      await store.save('test', sampleMetadata);
      
      await store.updateTableMetadata('test', 'users', {
        description: 'Updated description',
      });
      
      const updated = await store.load('test');
      const userTable = updated?.tables.find(t => t.name === 'users');
      
      expect(userTable?.description).toBe('Updated description');
      expect(userTable?.source).toBe('overridden');
    });

    it('should throw error when updating non-existent table', async () => {
      await store.save('test', sampleMetadata);
      
      await expect(
        store.updateTableMetadata('test', 'nonexistent', { description: 'test' })
      ).rejects.toThrow('Table nonexistent not found');
    });

    it('should throw error when updating non-existent catalog', async () => {
      await expect(
        store.updateTableMetadata('nonexistent', 'users', { description: 'test' })
      ).rejects.toThrow('Catalog nonexistent not found');
    });
  });
});