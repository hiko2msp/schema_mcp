import { basename, resolve } from 'path';
import { existsSync } from 'fs';
import { MCPServer } from './server/index.js';

const args = process.argv.slice(2);

let command: string;
let projectArg: string | undefined;

if (args[0] === 'install' || args[0] === 'install-skills') {
  command = args[0];
} else {
  command = 'serve';
  projectArg = args[0] || process.env.MCP_PROJECT_PATH;
}

const catalog = process.env.MCP_CATALOG || 'default';

if (command === 'install' || command === 'install-skills') {
  const { installSkills } = await import('./install-skills.js');
  await installSkills();
} else {
  let storePath: string;

  if (projectArg) {
    const resolvedPath = resolve(projectArg);
    if (basename(resolvedPath) === '.schema_mcp' && existsSync(resolvedPath)) {
      storePath = projectArg;
    } else {
      storePath = resolve(projectArg, '.schema_mcp');
    }
  } else {
    storePath = process.env.MCP_STORE_PATH || './.schema_mcp';
  }

  const server = new MCPServer(catalog, storePath);
  await server.start();
}
