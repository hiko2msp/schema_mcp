import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { MetadataStore } from '../store/index.js';

export class MCPServer {
  private server: Server;
  private store: MetadataStore;

  constructor(_catalog: string = 'default', storePath: string = './.schema_mcp') {
    this.server = new Server(
      {
        name: 'schema-mcp-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.store = new MetadataStore(storePath);
    this.setupToolHandlers();
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools: Tool[] = [
        {
          name: 'list_catalog',
          description: 'List all available catalogs',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'list_schema',
          description: 'List schemas in a catalog',
          inputSchema: {
            type: 'object',
            properties: {
              catalog: {
                type: 'string',
                description: 'Catalog name',
              },
            },
            required: ['catalog'],
          },
        },
        {
          name: 'list_tables',
          description: 'List tables in a schema',
          inputSchema: {
            type: 'object',
            properties: {
              catalog: {
                type: 'string',
                description: 'Catalog name',
              },
              schema: {
                type: 'string',
                description: 'Schema name',
              },
            },
            required: ['catalog', 'schema'],
          },
        },
        {
          name: 'get_table_schema',
          description: 'Get complete schema and metadata for a table',
          inputSchema: {
            type: 'object',
            properties: {
              catalog: {
                type: 'string',
                description: 'Catalog name',
              },
              schema: {
                type: 'string',
                description: 'Schema name',
              },
              table: {
                type: 'string',
                description: 'Table name',
              },
            },
            required: ['catalog', 'schema', 'table'],
          },
        },
        {
          name: 'search_tables',
          description: 'Fuzzy search for tables and columns',
          inputSchema: {
            type: 'object',
            properties: {
              catalog: {
                type: 'string',
                description: 'Catalog name',
              },
              query: {
                type: 'string',
                description: 'Search query',
              },
            },
            required: ['catalog', 'query'],
          },
        },
        {
          name: 'update_table_metadata',
          description: 'Update table metadata',
          inputSchema: {
            type: 'object',
            properties: {
              catalog: {
                type: 'string',
                description: 'Catalog name',
              },
              table: {
                type: 'string',
                description: 'Table name',
              },
              description: {
                type: 'string',
                description: 'New table description',
              },
            },
            required: ['catalog', 'table', 'description'],
          },
        },
      ];

      return { tools };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async request => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'list_catalog':
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(await this.store.listCatalogs()),
              },
            ],
          };

        case 'list_schema':
        case 'list_tables':
        case 'get_table_schema':
        case 'search_tables':
        case 'update_table_metadata':
          return await this.handleToolCall(name, args as Record<string, string>);

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  private async handleToolCall(name: string, args: Record<string, string>) {
    const catalog = args.catalog || 'default';

    switch (name) {
      case 'list_schema': {
        const metadata = await this.store.load(catalog);
        const schemas = metadata ? Array.from(new Set(metadata.tables.map(t => t.schema))) : [];
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(schemas),
            },
          ],
        };
      }

      case 'list_tables': {
        const metadata = await this.store.load(catalog);
        const tables = metadata ? metadata.tables.filter(t => t.schema === args.schema) : [];
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(tables),
            },
          ],
        };
      }

      case 'get_table_schema': {
        const metadata = await this.store.load(catalog);
        const table = metadata
          ? metadata.tables.find(t => t.name === args.table && t.schema === args.schema)
          : null;
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(table),
            },
          ],
        };
      }

      case 'search_tables': {
        const results = await this.store.searchTables(catalog, args.query);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results),
            },
          ],
        };
      }

      case 'update_table_metadata': {
        await this.store.updateTableMetadata(catalog, args.table, {
          description: args.description,
        });
        return {
          content: [
            {
              type: 'text',
              text: 'Metadata updated successfully',
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}
