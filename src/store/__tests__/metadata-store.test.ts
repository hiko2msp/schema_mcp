import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MetadataStore } from '../metadata-store.js';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

describe('MetadataStore', () => {
  let storePath: string;
  let store: MetadataStore;

  beforeEach(async () => {
    storePath = await mkdtemp(join(tmpdir(), 'schema-mcp-'));
    store = new MetadataStore(storePath);
  });

  afterEach(async () => {
    await rm(storePath, { recursive: true, force: true });
  });

  it('should save and load metadata', async () => {
    const metadata = {
      catalog: 'test',
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      tables: [
        {
          name: 'users',
          schema: 'public',
          description: 'Test table',
          source: 'inferred' as const,
          confidence: 0.8,
          columns: [
            {
              name: 'id',
              type: 'uuid',
              nullable: false,
              primaryKey: true,
              description: '',
              source: 'inferred' as const,
              confidence: 0.5,
            },
          ],
        },
      ],
    };

    await store.save('test', metadata);
    const loaded = await store.load('test');

    expect(loaded).toEqual(metadata);
  });

  it('should return null for non-existent catalog', async () => {
    const loaded = await store.load('non-existent');
    expect(loaded).toBeNull();
  });

  it('should search tables by name', async () => {
    const metadata = {
      catalog: 'test',
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      tables: [
        {
          name: 'users',
          schema: 'public',
          description: 'User accounts',
          source: 'inferred' as const,
          confidence: 0.8,
          columns: [
            {
              name: 'id',
              type: 'uuid',
              nullable: false,
              primaryKey: true,
              description: '',
              source: 'inferred' as const,
              confidence: 0.5,
            },
          ],
        },
        {
          name: 'orders',
          schema: 'public',
          description: 'User orders',
          source: 'inferred' as const,
          confidence: 0.8,
          columns: [],
        },
      ],
    };

    await store.save('test', metadata);
    const results = await store.searchTables('test', 'user');

    expect(results.length).toBe(2);
    expect(results.some(t => t.name === 'users')).toBe(true);
    expect(results.some(t => t.name === 'orders')).toBe(true);
  });

  it('should update table metadata', async () => {
    const metadata = {
      catalog: 'test',
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      tables: [
        {
          name: 'users',
          schema: 'public',
          description: 'Original description',
          source: 'inferred' as const,
          confidence: 0.8,
          columns: [],
        },
      ],
    };

    await store.save('test', metadata);
    await store.updateTableMetadata('test', 'users', { description: 'Updated description' });

    const updated = await store.load('test');
    expect(updated?.tables[0].description).toBe('Updated description');
    expect(updated?.tables[0].source).toBe('overridden');
  });

  describe('Security', () => {
    it('should throw an error for invalid catalog names to prevent path traversal', async () => {
      const maliciousCatalogs = [
        '../',
        '..',
        './',
        '/',
        '\\',
        'invalid/catalog',
        'invalid\\catalog',
        '../../etc/passwd',
      ];

      for (const catalog of maliciousCatalogs) {
        await expect(store.load(catalog)).rejects.toThrow(
          `Invalid catalog name: "${catalog}". Only alphanumeric characters, hyphens, and underscores are allowed.`
        );
        await expect(store.save(catalog, {} as any)).rejects.toThrow(
          `Invalid catalog name: "${catalog}". Only alphanumeric characters, hyphens, and underscores are allowed.`
        );
      }
    });

    it('should allow valid catalog names', async () => {
      const validCatalogs = ['valid-catalog', 'valid_catalog', 'valid123'];

      for (const catalog of validCatalogs) {
        // We don't expect it to find a file, but it shouldn't throw a sanitization error
        await expect(store.load(catalog)).resolves.toBeNull();
      }
    });

    it('should sanitize HTML in table descriptions to prevent XSS on save', async () => {
      const maliciousDescription = '<script>alert("XSS")</script>';
      const sanitizedDescription = '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;';

      const metadata = {
        catalog: 'test',
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        tables: [
          {
            name: 'users',
            schema: 'public',
            description: maliciousDescription,
            source: 'inferred' as const,
            confidence: 0.8,
            columns: [],
          },
        ],
      };

      await store.save('test', metadata);
      const loaded = await store.load('test');
      expect(loaded?.tables[0].description).toBe(sanitizedDescription);
    });

    it('should sanitize HTML in table descriptions to prevent XSS on update', async () => {
      const metadata = {
        catalog: 'test',
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        tables: [
          {
            name: 'users',
            schema: 'public',
            description: 'Original description',
            source: 'inferred' as const,
            confidence: 0.8,
            columns: [],
          },
        ],
      };

      const maliciousDescription = '<script>alert("XSS")</script>';
      const sanitizedDescription = '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;';

      await store.save('test', metadata);
      await store.updateTableMetadata('test', 'users', { description: maliciousDescription });

      const updated = await store.load('test');
      expect(updated?.tables[0].description).toBe(sanitizedDescription);
    });

    it('should sanitize HTML in column descriptions to prevent XSS on save', async () => {
      const maliciousDescription = '<script>alert("XSS")</script>';
      const sanitizedDescription = '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;';

      const metadata = {
        catalog: 'test',
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        tables: [
          {
            name: 'users',
            schema: 'public',
            description: 'A table',
            source: 'inferred' as const,
            confidence: 0.8,
            columns: [
              {
                name: 'id',
                type: 'uuid',
                nullable: false,
                primaryKey: true,
                description: maliciousDescription,
                source: 'inferred' as const,
                confidence: 0.5,
              },
            ],
          },
        ],
      };

      await store.save('test', metadata);
      const loaded = await store.load('test');
      expect(loaded?.tables[0].columns[0].description).toBe(sanitizedDescription);
    });
  });
});
