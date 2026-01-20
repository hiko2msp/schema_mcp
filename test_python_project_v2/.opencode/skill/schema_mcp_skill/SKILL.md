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

- Detect catalog_name from project structure. If there is `.schema_mcp/<catalog_name>/` directory, use it as catalog_name.
- Store schema in `.schema_mcp/<catalog_name>/schema.sql` 
  - If there is no schema.sql, create it.
  - If there is schema.sql, update it.
  - schema.sql is created from some codebase in this project.
- Store metadata in `.schema_mcp/<catalog_name>/metadata.yaml`
  - If there is no metadata.yaml, create it.
  - If there is metadata.yaml, update it.
  - metadata.yaml is created from some codebase in this project.
  - metadata.yaml should include how to update schema.sql.

## When to use me

Use this when setting up schema-mcp for a project or when database schema changes occur.

## How to work

ユーザーに質問せず、自動的に実行します。必要な情報は、プロジェクト以下のディレクトリを検索して得ます。
更新に必要な情報を集めるところから始めて下さい。積極的に動作しましょう。
