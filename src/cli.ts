import { MCPServer } from './server/index.js';

const catalog = process.env.MCP_CATALOG || 'default';
const storePath = process.env.MCP_STORE_PATH || './metadata';

const server = new MCPServer(catalog, storePath);
await server.start();
