#!/usr/bin/env node
import { mkdir, copyFile } from 'fs/promises';
import { join } from 'path';

const targetDir = '.opencode/skill/schema_mcp_skill';
const sourceFile = join('..', 'dist', 'skills', 'SKILL.md.template');
const targetFile = join(targetDir, 'SKILL.md');

console.log('Installing schema-mcp skills...');
console.log('sourceFile:', sourceFile);
console.log('targetFile:', targetFile);

try {
  await mkdir(targetDir, { recursive: true });
  await copyFile(sourceFile, targetFile);
  console.log('✓ Skills installed to', targetFile);
} catch (error) {
  console.error('Failed to install skills:', error);
  process.exit(1);
}
