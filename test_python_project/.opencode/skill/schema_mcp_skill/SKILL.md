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

- Collect DDL files and combine them into a single schema file `schema.sql` and save it in the `.schema_mcp/<catalog_name>/` directory
- Extract table and column metadata using schema-mcp Pipeline
- Infer descriptions for tables, columns, and foreign key relationships
- Store metadata in `.schema_mcp/<catalog_name>/` directory
- Support multiple databases with separate catalogs

## When to use me

Use this when setting up schema-mcp for a project or when database schema changes occur.
Ask clarifying questions if the project structure or DDL file organization is unclear.
