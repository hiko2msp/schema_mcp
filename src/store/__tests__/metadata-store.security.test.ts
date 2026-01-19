import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MetadataStore } from '../metadata-store.js';
import type { SchemaMetadata } from '../../core/types.js';
import { mkdtemp, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

describe('MetadataStore Security', () => {
  let store: MetadataStore;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'metadata-store-test-'));
    store = new MetadataStore(tempDir);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('should sanitize HTML in column descriptions to prevent XSS', async () => {
    // Arrange
    const catalog = 'test-catalog';
    const maliciousDescription = '<script>alert("XSS")</script>';
    const expectedSanitizedDescription = '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;';

    const metadata: SchemaMetadata = {
      version: '1.0',
      tables: [
        {
          name: 'users',
          description: 'User table',
          columns: [
            {
              name: 'id',
              type: 'INT',
              description: 'User ID',
            },
            {
              name: 'profile',
              type: 'VARCHAR',
              description: maliciousDescription,
            },
          ],
        },
      ],
    };

    // Act
    await store.save(catalog, metadata);
    const loadedMetadata = await store.load(catalog);

    // Assert
    expect(loadedMetadata).not.toBeNull();
    const taintedColumn = loadedMetadata?.tables[0]?.columns.find(
      c => c.name === 'profile'
    );
    expect(taintedColumn?.description).toBe(expectedSanitizedDescription);
  });
});
