import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MetadataStore } from '../metadata-store.js';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

describe('MetadataStore Search Verification', () => {
  let storePath: string;
  let store: MetadataStore;

  beforeEach(async () => {
    storePath = await mkdtemp(join(tmpdir(), 'schema-mcp-search-'));
    store = new MetadataStore(storePath);
  });

  afterEach(async () => {
    await rm(storePath, { recursive: true, force: true });
  });

  it('should match search queries against sanitized content', async () => {
    const descriptionWithQuote = "O'Reilly"; // Sanitized to O&#039;Reilly

    const metadata = {
      catalog: 'test',
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      tables: [
        {
          name: 'users',
          schema: 'public',
          description: descriptionWithQuote,
          source: 'inferred' as const,
          confidence: 0.8,
          columns: [],
        },
      ],
    };

    await store.save('test', metadata);

    // Search for original string
    const results = await store.searchTables('test', "O'Reilly");
    expect(results.length).toBe(1);
    expect(results[0].description).toBe("O&#039;Reilly");
  });
});
