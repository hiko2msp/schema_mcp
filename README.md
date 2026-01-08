# Schema Metadata MCP Server

A Model Context Protocol (MCP) server that provides database schema metadata to LLMs and AI agents.

## Features

- Automatic schema extraction from DDL, ORM definitions, and migration files
- Self-growing metadata store with AI-inferred descriptions
- MCP tools for schema discovery and search
- File-based metadata storage (JSON/YAML)
- Web UI for browsing and editing metadata

## Development

```bash
npm install
npm run dev
```

## Building

```bash
npm run build
```

## Testing

```bash
npm test
```

## Usage

### Installing Skills

To install the opencode skill for this project:

```bash
npm run install:skills
```

This builds the project and installs the skill to `.opencode/skill/schema_mcp_skill/SKILL.md`.

### Running the Server

```bash
npm run dev
```

See `docs/spec.md` for detailed specifications.
