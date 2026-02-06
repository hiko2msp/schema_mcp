import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MetadataStore } from '../metadata-store.js';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

describe('MetadataStore Security Verification', () => {
  let storePath: string;
  let store: MetadataStore;

  beforeEach(async () => {
    storePath = await mkdtemp(join(tmpdir(), 'schema-mcp-security-'));
    store = new MetadataStore(storePath);
  });

  afterEach(async () => {
    await rm(storePath, { recursive: true, force: true });
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
          description: 'Safe description',
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
