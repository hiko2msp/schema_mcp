import { describe, it, expect, beforeEach } from 'vitest';
import { ERDiagramGenerator } from '../er-diagram.js';
import type { SchemaMetadata, TableMetadata } from '../../core/types.js';

describe('ERDiagramGenerator', () => {
  let generator: ERDiagramGenerator;
  let sampleMetadata: SchemaMetadata;

  beforeEach(() => {
    generator = new ERDiagramGenerator();
    
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

  describe('generateERDiagram', () => {
    it('should generate basic Mermaid ER diagram', () => {
      const diagram = generator.generateERDiagram(sampleMetadata);
      
      expect(diagram).toContain('erDiagram');
      expect(diagram).toContain('users {');
      expect(diagram).toContain('posts {');
      expect(diagram).toContain('id int "PK, NOT NULL"');
      expect(diagram).toContain('email varchar "NOT NULL"');
      expect(diagram).toContain('users ||--o{ posts : "user_id -> id"');
    });

    it('should include nullable columns correctly', () => {
      const metadataWithNullable: SchemaMetadata = {
        ...sampleMetadata,
        tables: [
          {
            ...sampleMetadata.tables[0],
            columns: [
              ...sampleMetadata.tables[0].columns,
              {
                name: 'middle_name',
                type: 'VARCHAR',
                nullable: true,
                primaryKey: false,
                description: 'Optional middle name',
                source: 'inferred',
                confidence: 0.8,
              },
            ],
          },
        ],
      };

      const diagram = generator.generateERDiagram(metadataWithNullable);
      
      expect(diagram).toContain('middle_name varchar "NULL"');
    });
  });

  describe('generateStyledERDiagram', () => {
    it('should generate styled Mermaid graph', () => {
      const diagram = generator.generateStyledERDiagram(sampleMetadata);
      
      expect(diagram).toContain('graph LR');
      expect(diagram).toContain('subgraph users');
      expect(diagram).toContain('🔑');
      expect(diagram).toContain('🔗');
    });

    it('should differentiate primary and foreign keys', () => {
      const diagram = generator.generateStyledERDiagram(sampleMetadata);
      
      // Primary key should have 🔑
      expect(diagram).toContain('🔑');
      
      // Foreign key should have 🔗
      expect(diagram).toContain('🔗');
    });

    it('should show nullable vs required columns', () => {
      const metadataWithMixed: SchemaMetadata = {
        ...sampleMetadata,
        tables: [
          {
            ...sampleMetadata.tables[0],
            columns: [
              sampleMetadata.tables[0].columns[0], // NOT NULL primary key
              {
                ...sampleMetadata.tables[0].columns[1],
                nullable: true, // Make email nullable
              },
            ],
          },
        ],
      };

      const diagram = generator.generateStyledERDiagram(metadataWithMixed);
      
      // Should have different symbols for nullable vs required
      expect(diagram).toMatch(/[○●]/); // At least one of the symbols
    });
  });

  describe('generateRelationshipDiagram', () => {
    it('should generate relationship-focused diagram', () => {
      const diagram = generator.generateRelationshipDiagram(sampleMetadata);
      
      expect(diagram).toContain('graph TD');
      expect(diagram).toContain('users["users<br><small>User accounts and authentication data</small>"]');
      expect(diagram).toContain('posts["posts<br><small>Blog posts and articles</small>"]');
      expect(diagram).toContain('users --> posts');
    });

    it('should handle multiple relationships', () => {
      const metadataWithMultipleFKs: SchemaMetadata = {
        ...sampleMetadata,
        tables: [
          ...sampleMetadata.tables,
          {
            name: 'comments',
            schema: 'public',
            description: 'Comments on posts',
            source: 'inferred',
            confidence: 0.8,
            columns: [
              {
                name: 'id',
                type: 'INTEGER',
                nullable: false,
                primaryKey: true,
                description: 'Primary key',
                source: 'inferred',
                confidence: 0.9,
              },
              {
                name: 'post_id',
                type: 'INTEGER',
                nullable: false,
                primaryKey: false,
                foreignKey: { table: 'posts', column: 'id' },
                description: 'Reference to post',
                source: 'inferred',
                confidence: 0.9,
              },
              {
                name: 'user_id',
                type: 'INTEGER',
                nullable: false,
                primaryKey: false,
                foreignKey: { table: 'users', column: 'id' },
                description: 'Reference to user',
                source: 'inferred',
                confidence: 0.9,
              },
            ],
          },
        ],
      };

      const diagram = generator.generateRelationshipDiagram(metadataWithMultipleFKs);
      
      expect(diagram).toContain('users --> comments');
      expect(diagram).toContain('posts --> comments');
    });
  });

  describe('generateDocumentation', () => {
    it('should generate complete documentation', () => {
      const docs = generator.generateDocumentation(sampleMetadata);
      
      expect(docs).toContain('# Schema Documentation: test');
      expect(docs).toContain('## Summary');
      expect(docs).toContain('**Tables**: 2');
      expect(docs).toContain('## Entity Relationship Diagram');
      expect(docs).toContain('```mermaid');
      expect(docs).toContain('## Table Details');
      expect(docs).toContain('### users');
      expect(docs).toContain('| Column | Type | Nullable |');
    });

    it('should include table statistics', () => {
      const docs = generator.generateDocumentation(sampleMetadata);
      
      expect(docs).toContain('**Tables**: 2');
      expect(docs).toContain('**Columns**: 4'); // 2 from users + 2 from posts
      expect(docs).toContain('**Relationships**: 1'); // One foreign key
    });

    it('should include foreign key information in table details', () => {
      const docs = generator.generateDocumentation(sampleMetadata);
      
      expect(docs).toContain('users.id'); // Foreign key reference
    });
  });

  describe('mapToMermaidType', () => {
    it('should map common SQL types to Mermaid types', () => {
      // Test through generateERDiagram
      const testMetadata: SchemaMetadata = {
        catalog: 'test',
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        tables: [
          {
            name: 'test_table',
            schema: 'public',
            description: 'Test table',
            source: 'inferred',
            confidence: 0.8,
            columns: [
              { name: 'int_col', type: 'INTEGER', nullable: false, primaryKey: false, description: '', source: 'inferred', confidence: 0.8 },
              { name: 'varchar_col', type: 'VARCHAR', nullable: false, primaryKey: false, description: '', source: 'inferred', confidence: 0.8 },
              { name: 'bool_col', type: 'BOOLEAN', nullable: false, primaryKey: false, description: '', source: 'inferred', confidence: 0.8 },
              { name: 'timestamp_col', type: 'TIMESTAMP', nullable: false, primaryKey: false, description: '', source: 'inferred', confidence: 0.8 },
              { name: 'json_col', type: 'JSONB', nullable: false, primaryKey: false, description: '', source: 'inferred', confidence: 0.8 },
            ],
          },
        ],
      };

      const diagram = generator.generateERDiagram(testMetadata);
      
      expect(diagram).toContain('int_col int');
      expect(diagram).toContain('varchar_col varchar');
      expect(diagram).toContain('bool_col bool');
      expect(diagram).toContain('timestamp_col datetime');
      expect(diagram).toContain('json_col json');
    });

    it('should handle types with parameters', () => {
      const testMetadata: SchemaMetadata = {
        catalog: 'test',
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        tables: [
          {
            name: 'test_table',
            schema: 'public',
            description: 'Test table',
            source: 'inferred',
            confidence: 0.8,
            columns: [
              { name: 'varchar_col', type: 'VARCHAR(255)', nullable: false, primaryKey: false, description: '', source: 'inferred', confidence: 0.8 },
              { name: 'decimal_col', type: 'DECIMAL(10,2)', nullable: false, primaryKey: false, description: '', source: 'inferred', confidence: 0.8 },
            ],
          },
        ],
      };

      const diagram = generator.generateERDiagram(testMetadata);
      
      expect(diagram).toContain('varchar_col varchar');
      expect(diagram).toContain('decimal_col decimal');
    });
  });
});