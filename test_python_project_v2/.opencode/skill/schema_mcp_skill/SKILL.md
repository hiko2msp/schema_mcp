---
name: update-schema
description: Collect and structure database schema metadata
license: MIT
compatibility: opencode
metadata:
  audience: developers
  workflow: database
---

## What I do

- Collect DDL files and combine them into a single schema file `schema.sql` in the project root
- Move `schema.sql` to `.schema_mcp/<catalog_name>/` directory for reference
- Extract table and column metadata using schema-mcp Pipeline
- Store metadata in `.schema_mcp/<catalog_name>/metadata.yaml`
- Support multiple databases with separate catalogs

## When to use me

Use this when setting up schema-mcp for a project or when database schema changes occur.
Ask clarifying questions if the project structure or DDL file organization is unclear.
