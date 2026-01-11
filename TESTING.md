# Testing Guide

This document describes how to run tests for the Schema MCP Server.

## Test Framework

- **Framework**: Vitest
- **Location**: `src/**/__tests__/*.test.ts`

## Running Tests

```bash
npm test                 # Run all tests
npm run test:watch       # Run tests in watch mode
npm run test:unit        # Run unit tests only
```

### Single Test Execution

```bash
npx vitest run src/extractors/__tests__/ddl.test.ts           # Specific file
npx vitest run --reporter=verbose                            # Detailed output
npx vitest run -t "should extract tables"                    # By test name pattern
```

## Test Coverage

| Module | Tests | Status |
|--------|-------|--------|
| Description Generator | 12 | ✅ All passing |
| ER Diagram | 12 | ✅ All passing |
| DDL Extractor | 4 | ✅ All passing |
| Prisma Extractor | 8 | ✅ All passing |
| Metadata Store | 6 | ✅ All passing |
| Pipeline Diff | 5 | ✅ All passing |
| Fuzzy Search | 19 | ✅ All passing |

**Total: 66 tests, all passing**

## Test Files

### Core Tests
- `src/core/__tests__/description-generator.test.ts` - Automatic description generation for tables/columns

### Extractor Tests
- `src/extractors/__tests__/ddl.test.ts` - DDL file parsing (CREATE TABLE statements)
- `src/extractors/__tests__/prisma.test.ts` - Prisma schema parsing

### Store Tests
- `src/store/__tests__/metadata-store.test.ts` - Metadata save/load operations
- `src/store/__tests__/fuzzy-search.test.ts` - Search functionality

### Tool Tests
- `src/tools/__tests__/er-diagram.test.ts` - Mermaid diagram generation
- `src/tools/__tests__/pipeline-diff.test.ts` - Schema change detection

## Quick Verification

Run all tests to verify the system works correctly:

```bash
npm install && npm test
```

Expected output: All 66 tests passing.