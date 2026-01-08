import { MCPServer } from './server/index.js';

const args = process.argv.slice(2);
const command = args[0];

if (command === 'install' || command === 'install-skills') {
  const { installSkills } = await import('./install-skills.js');
  await installSkills();
} else {
  const catalog = process.env.MCP_CATALOG || 'default';
  const storePath = process.env.MCP_STORE_PATH || './.schema_mcp';

  const server = new MCPServer(catalog, storePath);
  await server.start();
}
