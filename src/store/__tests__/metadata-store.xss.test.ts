
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { vol } from 'memfs';
import { MetadataStore } from '../metadata-store';
import type { SchemaMetadata } from '../../core/types';

// Mock the entire 'fs/promises' and 'fs' modules
vi.mock('fs/promises', () => vol.promises);
vi.mock('fs', () => vol);

describe('MetadataStore XSS Prevention', () => {
  let store: MetadataStore;
  const catalog = 'test-catalog';
  const storePath = '/test-store';

  beforeEach(() => {
    vol.reset(); // Clear the virtual file system before each test
    store = new MetadataStore(storePath);
  });

  it('should sanitize column descriptions to prevent XSS', async () => {
    // Arrange
    const maliciousDescription = "<script>alert('xss')</script>";
    const sanitizedDescription = '&lt;script&gt;alert(&#039;xss&#039;)&lt;/script&gt;';
    const metadata: SchemaMetadata = {
      version: '1',
      tables: [
        {
          name: 'users',
          schema: 'public',
          description: 'User table',
          columns: [
            {
              name: 'id',
              type: 'integer',
              description: 'User ID',
            },
            {
              name: 'profile',
              type: 'text',
              description: maliciousDescription,
            },
          ],
        },
      ],
    };

    // Act
    await store.save(catalog, metadata);
    const loadedMetadata = await store.load(catalog);
    const updatedColumn = loadedMetadata?.tables[0].columns.find(c => c.name === 'profile');

    // Assert
    expect(updatedColumn?.description).toBe(sanitizedDescription);
  });
});
