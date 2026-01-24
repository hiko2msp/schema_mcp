import { describe, it, expect, beforeEach } from 'vitest';
import { MetadataStore } from '../metadata-store';
import { vol } from 'memfs';
import type { SchemaMetadata } from '../../core/types';

// Mock the file system
vi.mock('fs/promises', async () => {
  const memfs = await vi.importActual<typeof import('memfs')>('memfs');
  return memfs.vol.promises;
});
vi.mock('fs', async () => {
  const memfs = await vi.importActual<typeof import('memfs')>('memfs');
  return {
    existsSync: memfs.vol.existsSync,
  };
});

describe('MetadataStore Security', () => {
  let store: MetadataStore;
  const catalog = 'test_catalog';
  const maliciousDescription = '<script>alert("XSS")</script>';
  const sanitizedDescription = '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;';

  beforeEach(() => {
    vol.reset();
    store = new MetadataStore('./.test_metadata');
  });

  it('should sanitize column descriptions on save', async () => {
    const metadata: SchemaMetadata = {
      tables: [
        {
          name: 'users',
          description: 'User table',
          columns: [
            { name: 'id', type: 'int', description: 'User ID' },
            { name: 'email', type: 'string', description: maliciousDescription },
          ],
        },
      ],
    };

    await store.save(catalog, metadata);
    const loaded = await store.load(catalog);

    expect(loaded?.tables[0].columns[1].description).toBe(sanitizedDescription);
  });

  it('should sanitize descriptions on updateTableMetadata', async () => {
    const initialMetadata: SchemaMetadata = {
      tables: [
        {
          name: 'users',
          description: 'User table',
          columns: [
            { name: 'id', type: 'int', description: 'User ID' },
          ],
        },
      ],
    };
    await store.save(catalog, initialMetadata);

    await store.updateTableMetadata(catalog, 'users', {
      description: maliciousDescription,
      columns: [
        { name: 'id', type: 'int', description: 'User ID' },
        { name: 'email', type: 'string', description: maliciousDescription },
      ],
    });

    const loaded = await store.load(catalog);
    expect(loaded?.tables[0].description).toBe(sanitizedDescription);
    expect(loaded?.tables[0].columns[1].description).toBe(sanitizedDescription);
  });
});
