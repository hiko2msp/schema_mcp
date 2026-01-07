# Schema Metadata MCP Server - Agent Guidelines

This document provides guidelines for AI agents working on this codebase.

## Project Overview

A Model Context Protocol (MCP) server that provides database schema metadata to LLMs. The server extracts schema information from DDL/ORM/migration files, stores it in a file-based metadata store, and provides MCP tools for discovery and search.

**Architecture**: "勝手に育つメタデータストア" (self-growing metadata store) - continuously collects, infers, and manages schema metadata with minimal manual intervention.

---

## Development Commands

### Core Commands

```bash
npm install              # Install dependencies
npm run dev              # Start development server with hot reload (tsx watch)
npm run build            # Compile TypeScript
npm start                # Run compiled server
```

### Testing

```bash
npm test                 # Run all tests (vitest)
npm run test:watch       # Run tests in watch mode
npm run test:unit        # Run unit tests only (*.test.ts)
npm run test:integration # Run integration tests only (*.integration.ts)
```

### Single Test Execution

```bash
npx vitest run src/extractors/__tests__/ddl.test.ts           # Run specific test file
npx vitest run --reporter=verbose                            # Detailed test output
npx vitest run -t "should parse table names correctly"      # Run tests matching pattern
```

### Code Quality

```bash
npm run lint            # Run ESLint
npm run lint:fix        # Auto-fix linting issues
npm run format          # Format with Prettier
npm run format:check    # Check formatting without modifying
npm run typecheck       # Run TypeScript compiler checks (no emit)
```

**Always run** `npm run typecheck` and `npm run lint` before committing changes.

---

## Code Style Guidelines

### Import Style

- Use ES module imports (default)
- Group imports in this order: 1) External deps, 2) Internal deps, 3) Relative paths

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { MetadataStore } from '../store/index.js';
import type { ExtractorConfig } from '../core/types.js';
import { readFile } from 'fs/promises';
```

- Always include `.js` extension for internal imports (required for ES modules)
- Use `type` keyword for type-only imports: `import type { TableMetadata } from './types.js'`

### Formatting

- **Semicolons**: Required (`"semi": true`)
- **Quotes**: Single quotes (`"singleQuote": true`)
- **Indentation**: 2 spaces
- **Trailing commas**: ES5 compatible
- **Line width**: 100 characters

Run `npm run format` to auto-format before committing.

### Type Definitions

- Always use TypeScript interfaces for object shapes
- Define types in `src/core/types.ts` for shared types
- Use discriminated unions for variant types (e.g., `source: 'inferred' | 'human' | 'overridden'`)
- Export types explicitly for external use

```typescript
export interface TableMetadata {
  name: string;
  schema: string;
  description: string;
  source: 'inferred' | 'human' | 'overridden';
  confidence: number;
  columns: ColumnMetadata[];
}
```

### Naming Conventions

- **Files**: kebab-case (`metadata-store.ts`, `ddl-extractor.ts`)
- **Classes**: PascalCase (`class MetadataStore`, `class DDLExtractor`)
- **Methods/Functions**: camelCase (`async extract()`, `parseColumns()`)
- **Constants**: UPPER_SNAKE_CASE for exports, camelCase for module-level
- **Private methods**: Prefix with underscore (`_parseDDL()`)
- **Interfaces**: PascalCase (`interface ExtractorResult`)

### Error Handling

- Use standard `Error` objects with descriptive messages
- Async functions should throw errors, not return error objects

```typescript
if (!metadata) {
  throw new Error(`Catalog ${catalog} not found`);
}
```

- Validate input at boundaries (extractors, MCP tools)
- Use try-catch for I/O operations

### Class Design

- Use abstract base classes for extractors: `abstract class BaseExtractor`

```typescript
export abstract class BaseExtractor {
  protected config: ExtractorConfig;

  constructor(config: ExtractorConfig) {
    this.config = config;
  }

  abstract extract(): Promise<ExtractorResult>;
}
```

- Keep methods focused (single responsibility)
- Use `private` for implementation details, `protected` for subclass use
- Constructor parameters should be simple; complex config via objects

### Testing Guidelines

- Use Vitest (test framework)
- Test file naming: `*.test.ts` (unit), `*.integration.ts` (integration)
- Place tests in `__tests__` subdirectory next to source
- Use `describe`, `it`, `expect` from vitest

```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('DDLExtractor', () => {
  it('should extract tables from DDL', async () => {
    const config: ExtractorConfig = {
      type: 'ddl',
      path: './example/schema.sql',
    };
    const extractor = new DDLExtractor(config);
    const result = await extractor.extract();

    expect(result.tables).toBeDefined();
    expect(result.tables.length).toBeGreaterThan(0);
  });
});
```

- Test file I/O using temp directories (mkdtemp)
- Clean up resources in `afterEach`
- Test both success and error paths

### File Structure

```
src/
├── core/           # Shared types and interfaces
├── extractors/     # DDL/ORM parsers
├── store/          # Metadata storage
├── server/         # MCP server implementation
├── tools/          # Pipeline and utilities
├── utils/          # Helper functions
└── cli.ts          # CLI entry point
```

### Comments and Documentation

- **NO COMMENTS** unless explicitly asked
- Code should be self-documenting through clear naming
- Use descriptive variable and function names instead of inline comments

---

## MCP Server Development

### Adding New Tools

1. Add tool definition in `setupToolHandlers()` in `src/server/mcp-server.ts`
2. Implement handler in `handleToolCall()` method
3. Add to `ListToolsRequestSchema` response

```typescript
{
  name: 'my_new_tool',
  description: 'Tool description',
  inputSchema: {
    type: 'object',
    properties: {
      param: { type: 'string', description: 'Parameter' },
    },
    required: ['param'],
  },
}
```

### Tool Response Format

Always return MCP-compliant response:

```typescript
return {
  content: [
    {
      type: 'text',
      text: JSON.stringify(data),
    },
  ],
};
```

---

## Extractor Implementation

### Creating New Extractors

1. Extend `BaseExtractor` in `src/extractors/base.ts`
2. Implement `extract(): Promise<ExtractorResult>`
3. Register in `Pipeline.createExtractor()`
4. Add tests in `src/extractors/__tests__/`

```typescript
export class MyExtractor extends BaseExtractor {
  async extract(): Promise<ExtractorResult> {
    const content = await readFile(this.config.path, 'utf-8');
    const tables = this.parseContent(content);
    return { tables, version: this.generateVersion(content) };
  }
}
```

---

## Key Design Principles

1. **Idempotency**: Same input always produces same metadata
2. **Non-invasive**: Don't force specific DDL/migration formats
3. **Traceability**: Metadata includes `source` and `confidence` fields
4. **File-based storage**: Metadata in YAML/JSON, Git-friendly
5. **Human-readable**: All metadata understandable without LLM

---

## Common Patterns

### Reading Files

```typescript
import { readFile } from 'fs/promises';

const content = await readFile(path, 'utf-8');
```

### Writing YAML

```typescript
import * as yaml from 'yaml';
import { writeFile } from 'fs/promises';

await writeFile(path, yaml.stringify(data), 'utf-8');
```

### Parsing DDL

Use regex patterns for initial extraction, validate structure in tests

```typescript
const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["`']?(\w+)["`']?\s*\(([\s\S]*?)\);/gi;
```

---

## Dependencies

**Core**:
- `@modelcontextprotocol/sdk` - MCP server framework
- `yaml` - YAML parsing/serialization
- `fuse.js` - Fuzzy search (not yet integrated)

**Dev**:
- `typescript` - Type checking
- `vitest` - Testing
- `eslint` - Linting
- `prettier` - Formatting
- `tsx` - TypeScript execution (dev mode)
