import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MetadataStore } from '../metadata-store.js';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

describe('MetadataStore Idempotency Verification', () => {
  let storePath: string;
  let store: MetadataStore;

  beforeEach(async () => {
    storePath = await mkdtemp(join(tmpdir(), 'schema-mcp-idempotency-'));
    store = new MetadataStore(storePath);
  });

  afterEach(async () => {
    await rm(storePath, { recursive: true, force: true });
  });

  it('should not double-sanitize HTML in table descriptions', async () => {
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

    // First save
    await store.save('test', metadata);
    let loaded = await store.load('test');
    expect(loaded?.tables[0].description).toBe(sanitizedDescription);

    // Second save (simulating loading and saving again)
    await store.save('test', loaded!);
    loaded = await store.load('test');
    expect(loaded?.tables[0].description).toBe(sanitizedDescription); // Should still be the same!
  });
});
