import { Pipeline } from '../dist/tools/pipeline.js';
import { mkdir, copyFile } from 'fs/promises';

const catalog = 'test_python_project';

await mkdir(`./.schema_mcp/${catalog}`, { recursive: true });
await copyFile('./schema.sql', `./.schema_mcp/${catalog}/schema.sql`);

const pipeline = new Pipeline('./.schema_mcp');

await pipeline.run(catalog, [
  {
    type: 'ddl',
    path: `./.schema_mcp/${catalog}/schema.sql`,
  },
]);

console.log('✓ Schema extraction complete');
