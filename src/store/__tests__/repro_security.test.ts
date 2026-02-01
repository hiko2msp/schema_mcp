import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MetadataStore } from '../metadata-store.js';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

describe('MetadataStore Reproduction', () => {
  let storePath: string;
  let store: MetadataStore;

  beforeEach(async () => {
    storePath = await mkdtemp(join(tmpdir(), 'schema-mcp-repro-'));
    store = new MetadataStore(storePath);
  });

  afterEach(async () => {
    await rm(storePath, { recursive: true, force: true });
  });

  it('should NOT double sanitize on updateTableMetadata', async () => {
    const metadata = {
      catalog: 'test',
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      tables: [
        {
          name: 'users',
          schema: 'public',
          description: 'User & pass',
          source: 'inferred' as const,
          confidence: 0.8,
          columns: [],
        },
      ],
    };

    await store.save('test', metadata);
    const loaded = await store.load('test');
    expect(loaded?.tables[0].description).toBe('User &amp; pass');

    // Update something else
    await store.updateTableMetadata('test', 'users', { confidence: 0.9 });

    const updated = await store.load('test');
    // If it double sanitizes, it will be 'User &amp;amp; pass'
    expect(updated?.tables[0].description).toBe('User &amp; pass');
  });

  it('should sanitize HTML in column descriptions', async () => {
    const metadata = {
      catalog: 'test',
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      tables: [
        {
          name: 'users',
          schema: 'public',
          description: 'Safe',
          source: 'inferred' as const,
          confidence: 0.8,
          columns: [
            {
              name: 'id',
              type: 'uuid',
              nullable: false,
              primaryKey: true,
              description: '<script>alert(1)</script>',
              source: 'inferred' as const,
              confidence: 0.5,
            }
          ],
        },
      ],
    };

    await store.save('test', metadata);
    const loaded = await store.load('test');
    expect(loaded?.tables[0].columns[0].description).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
  });
});
