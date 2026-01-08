import { Pipeline } from '../dist/tools/pipeline.js';

const pipeline = new Pipeline('./.schema_mcp');

await pipeline.run('test_python_project', [
  {
    type: 'ddl',
    path: './schema.sql',
  },
]);

console.log('✓ Schema extraction complete');
