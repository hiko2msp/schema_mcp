import { describe, it, expect, beforeEach } from 'vitest';
import { DescriptionGenerator } from '../description-generator.js';
import type { TableMetadata, ColumnMetadata } from '../types.js';

describe('DescriptionGenerator', () => {
  let generator: DescriptionGenerator;

  beforeEach(() => {
    generator = new DescriptionGenerator();
  });

  describe('generateTableDescription', () => {
    it('should generate appropriate descriptions for common table patterns', () => {
      const userTable: TableMetadata = {
        name: 'users',
        schema: 'public',
        description: '',
        source: 'inferred',
        confidence: 0,
        columns: [
          { name: 'id', type: 'INTEGER', nullable: false, primaryKey: true, description: '', source: 'inferred', confidence: 0 },
          { name: 'email', type: 'VARCHAR', nullable: false, primaryKey: false, description: '', source: 'inferred', confidence: 0 },
          { name: 'created_at', type: 'TIMESTAMP', nullable: false, primaryKey: false, description: '', source: 'inferred', confidence: 0 },
        ],
      };

      const result = generator.generateTableDescription(userTable);
      
      expect(result.description).toContain('user');
      expect(result.confidence).toBe(0.9);
      expect(result.source).toBe('inferred');
      expect(result.description).toContain('automatic timestamp tracking');
    });

    it('should handle junction tables', () => {
      const junctionTable: TableMetadata = {
        name: 'user_role_mappings',
        schema: 'public',
        description: '',
        source: 'inferred',
        confidence: 0,
        columns: [
          { name: 'user_id', type: 'INTEGER', nullable: false, primaryKey: false, description: '', source: 'inferred', confidence: 0, foreignKey: { table: 'users', column: 'id' } },
          { name: 'role_id', type: 'INTEGER', nullable: false, primaryKey: false, description: '', source: 'inferred', confidence: 0, foreignKey: { table: 'roles', column: 'id' } },
        ],
      };

      const result = generator.generateTableDescription(junctionTable);
      
      expect(result.description).toMatch(/junction table/i);
      expect(result.assumptions).toContain('Assumed to be a junction table based on naming pattern');
    });

    it('should generate generic descriptions for unknown patterns', () => {
      const unknownTable: TableMetadata = {
        name: 'mysterious_entities',
        schema: 'public',
        description: '',
        source: 'inferred',
        confidence: 0,
        columns: [],
      };

      const result = generator.generateTableDescription(unknownTable);
      
      expect(result.description).toContain('mysterious entities');
      expect(result.confidence).toBe(0.5);
      expect(result.assumptions).toContain('Generic description based on table name only');
    });
  });

  describe('generateColumnDescription', () => {
    it('should handle primary key columns', () => {
      const pkColumn: ColumnMetadata = {
        name: 'id',
        type: 'INTEGER',
        nullable: false,
        primaryKey: true,
        description: '',
        source: 'inferred',
        confidence: 0,
      };

      const result = generator.generateColumnDescription(pkColumn, 'users');
      
      expect(result.description).toContain('Primary key');
      expect(result.confidence).toBe(0.9);
    });

    it('should handle foreign key columns', () => {
      const fkColumn: ColumnMetadata = {
        name: 'user_id',
        type: 'INTEGER',
        nullable: false,
        primaryKey: false,
        foreignKey: { table: 'users', column: 'id' },
        description: '',
        source: 'inferred',
        confidence: 0,
      };

      const result = generator.generateColumnDescription(fkColumn, 'posts');
      
      expect(result.description).toContain('Foreign key');
      expect(result.confidence).toBe(0.9);
    });

    it('should handle timestamp columns', () => {
      const timestampColumn: ColumnMetadata = {
        name: 'created_at',
        type: 'TIMESTAMP',
        nullable: false,
        primaryKey: false,
        description: '',
        source: 'inferred',
        confidence: 0,
      };

      const result = generator.generateColumnDescription(timestampColumn, 'posts');
      
      expect(result.description).toContain('created');
      expect(result.confidence).toBe(0.9);
    });

    it('should handle email columns', () => {
      const emailColumn: ColumnMetadata = {
        name: 'email',
        type: 'VARCHAR',
        nullable: false,
        primaryKey: false,
        description: '',
        source: 'inferred',
        confidence: 0,
      };

      const result = generator.generateColumnDescription(emailColumn, 'users');
      
      expect(result.description).toContain('Email address');
      expect(result.confidence).toBe(0.9);
    });

    it('should handle status columns', () => {
      const statusColumn: ColumnMetadata = {
        name: 'status',
        type: 'VARCHAR',
        nullable: false,
        primaryKey: false,
        description: '',
        source: 'inferred',
        confidence: 0,
      };

      const result = generator.generateColumnDescription(statusColumn, 'orders');
      
      expect(result.description).toContain('status');
      expect(result.confidence).toBe(0.8);
    });

    it('should handle nullable fields with assumptions', () => {
      const nullableColumn: ColumnMetadata = {
        name: 'middle_name',
        type: 'VARCHAR',
        nullable: true,
        primaryKey: false,
        description: '',
        source: 'inferred',
        confidence: 0,
      };

      const result = generator.generateColumnDescription(nullableColumn, 'users');
      
      expect(result.description).toContain('name');
      expect(result.assumptions).toContain('Field is nullable - may contain null values');
    });

    it('should generate generic descriptions for unknown patterns', () => {
      const unknownColumn: ColumnMetadata = {
        name: 'mysterious_field',
        type: 'VARCHAR',
        nullable: false,
        primaryKey: false,
        description: '',
        source: 'inferred',
        confidence: 0,
      };

      const result = generator.generateColumnDescription(unknownColumn, 'mysterious_table');
      
      expect(result.description).toContain('mysterious field');
      expect(result.confidence).toBe(0.5);
      expect(result.assumptions).toContain('Generic description based on column name only');
    });
  });

  describe('enhanceTableMetadata', () => {
    it('should enhance table and column descriptions', () => {
      const table: TableMetadata = {
        name: 'users',
        schema: 'public',
        description: '',
        source: 'inferred',
        confidence: 0,
        columns: [
          { name: 'id', type: 'INTEGER', nullable: false, primaryKey: true, description: '', source: 'inferred', confidence: 0 },
          { name: 'email', type: 'VARCHAR', nullable: false, primaryKey: false, description: '', source: 'inferred', confidence: 0 },
        ],
      };

      const result = generator.enhanceTableMetadata(table);
      
      expect(result.description).toContain('user');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.columns[0].description).toContain('Primary key');
      expect(result.columns[1].description).toContain('Email address');
    });

    it('should not override human-provided descriptions', () => {
      const table: TableMetadata = {
        name: 'users',
        schema: 'public',
        description: 'Human written description',
        source: 'human',
        confidence: 1.0,
        columns: [
          { name: 'id', type: 'INTEGER', nullable: false, primaryKey: true, description: 'Human column description', source: 'human', confidence: 1.0 },
        ],
      };

      const result = generator.enhanceTableMetadata(table);
      
      expect(result.description).toBe('Human written description');
      expect(result.source).toBe('human');
      expect(result.columns[0].description).toBe('Human column description');
      expect(result.columns[0].source).toBe('human');
    });
  });
});