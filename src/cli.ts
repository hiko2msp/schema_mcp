import { basename, resolve } from 'path';
import { existsSync } from 'fs';
import { MCPServer } from './server/index.js';

function showHelp() {
  console.log(`
Usage: schema-mcp [command] [options]

Commands:
  serve [path]       Start the MCP server (default)
  install-skills     Install skills to the local project
  completion         Show shell completion script for zsh

Options:
  -h, --help         Show this help message
  
Environment Variables:
  MCP_PROJECT_PATH   Default path for the project
  MCP_CATALOG        Catalog name (default: "default")
  MCP_STORE_PATH     Base path for the metadata store (default: "./.schema_mcp")
`);
}

function showCompletion() {
  console.log(`
#compdef schema-mcp

_schema-mcp() {
  local line

  _arguments -C \\
    "1: :((serve\\:'Start the MCP server' install-skills\\:'Install skills' completion\\:'Show shell completion script'))" \\
    "*::arg:->args"

  case $line[1] in
    serve)
      _arguments \\
        "1:path:_files -/"
    ;;
  esac
}

compdef _schema-mcp schema-mcp
`);
}

const args = process.argv.slice(2);

if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
  showHelp();
  process.exit(0);
}

if (args[0] === 'completion') {
  showCompletion();
  process.exit(0);
}

let command: string;
let projectArg: string | undefined;

if (args[0] === 'install' || args[0] === 'install-skills') {
  command = 'install-skills';
} else if (args[0] === 'serve') {
  command = 'serve';
  projectArg = args[1] || process.env.MCP_PROJECT_PATH;
} else {
  // Default to serve if no command or non-command arg is provided
  command = 'serve';
  projectArg = args[0] || process.env.MCP_PROJECT_PATH;
}

const catalog = process.env.MCP_CATALOG || 'default';

if (command === 'install-skills') {
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
