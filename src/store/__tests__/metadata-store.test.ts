import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MetadataStore } from '../metadata-store.js';
import { vol } from 'memfs';
import { mkdtemp, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import type { SchemaMetadata } from '../../core/types.js';

// Mock the fs/promises module
vi.mock('fs/promises', async () => {
  const memfs = await import('memfs');
  return memfs.fs.promises;
});

vi.mock('fs', async () => {
  const memfs = await import('memfs');
  return memfs.fs;
});

describe('MetadataStore', () => {
  let store: MetadataStore;
  let tempDir: string;
  const testCatalog = 'test_catalog';
  const testMetadata: SchemaMetadata = {
    version: '1',
    tables: [
      {
        name: 'users',
        schema: 'public',
        description: 'Table for storing user data',
        columns: [{ name: 'id', type: 'integer', description: 'User ID' }],
        source: 'inferred',
        confidence: 0.8,
      },
      {
        name: 'products',
        schema: 'public',
        description: 'Table for storing product data',
        columns: [{ name: 'id', type: 'integer', description: 'Product ID' }],
        source: 'inferred',
        confidence: 0.8,
      },
    ],
  };

  beforeEach(async () => {
    vol.reset();
    // Create a temporary directory in the mock filesystem
    tempDir = await mkdtemp('/test-');
    store = new MetadataStore(tempDir);
    await store.save(testCatalog, testMetadata);
  });

  afterEach(async () => {
    // Clean up the temporary directory
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('sanitize', () => {
    it('should strip path traversal characters', () => {
      expect(store.sanitize('../../../etc/passwd')).toBe('etcpasswd');
    });

    it('should handle mixed valid and invalid characters', () => {
      expect(store.sanitize('valid-../-name')).toBe('valid--name');
    });

    it('should not modify valid names', () => {
      expect(store.sanitize('my_catalog-123')).toBe('my_catalog-123');
    });
  });

  describe('save and load', () => {
    it('should save and load metadata', async () => {
      const loaded = await store.load(testCatalog);
      const loadedMetadata = { ...loaded };
      delete loadedMetadata.tables[0].description;
      const testMetadataToCompare = { ...testMetadata };
      delete testMetadataToCompare.tables[0].description;
      expect(loadedMetadata).toEqual(testMetadataToCompare);
    });

    it('should return null for non-existent catalog', async () => {
      const loaded = await store.load('non_existent_catalog');
      expect(loaded).toBeNull();
    });

    it('should sanitize HTML in descriptions on save', async () => {
      const xssMetadata: SchemaMetadata = {
        version: '1',
        tables: [
          {
            name: 'xss_table',
            schema: 'public',
            description: '<script>alert("xss")</script>',
            columns: [],
            source: 'inferred',
            confidence: 1,
          },
        ],
      };
      await store.save('xss_catalog', xssMetadata);
      const loaded = await store.load('xss_catalog');
      expect(loaded?.tables[0].description).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    });
  });

  describe('listCatalogs', () => {
    it('should list all catalogs', async () => {
      await store.save('catalog2', testMetadata);
      const catalogs = await store.listCatalogs();
      expect(catalogs).toContain(testCatalog);
      expect(catalogs).toContain('catalog2');
      expect(catalogs.length).toBe(2);
    });
  });

  describe('updateTableMetadata', () => {
    it('should update the description of a table', async () => {
      const newDescription = 'An updated description';
      await store.updateTableMetadata(testCatalog, 'users', {
        description: newDescription,
      });
      const loaded = await store.load(testCatalog);
      const updatedTable = loaded?.tables.find(t => t.name === 'users');
      expect(updatedTable?.description).toBe(newDescription);
      expect(updatedTable?.source).toBe('overridden');
    });
  });

  describe('searchTables', () => {
    it('should find tables by name', async () => {
      const results = await store.searchTables(testCatalog, 'users');
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('users');
    });

    it('should find tables by description', async () => {
      const results = await store.searchTables(testCatalog, 'product data');
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('products');
    });
  });

  describe('path traversal security', () => {
    it('should not allow loading files outside of the metadata path', async () => {
      // Create a dummy file outside the store's path
      const secretPath = join(tempDir, '../secret.txt');
      await writeFile(secretPath, 'secret data');

      // Attempt to load the file using a path traversal attack
      const promise = store.load('../../secret.txt');

      // It should return null because the sanitized path won't exist
      await expect(promise).resolves.toBeNull();

      // Clean up the dummy file
      await rm(secretPath);
    });
  });
});
