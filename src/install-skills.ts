#!/usr/bin/env node

import { mkdir, copyFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function installSkills() {
  const targetDir = '.opencode/skill/schema_mcp_skill';
  const sourceFile = join(__dirname, 'skills', 'SKILL.md.template');
  const targetFile = join(targetDir, 'SKILL.md');

  console.log('Installing schema-mcp skills...');

  try {
    await mkdir(targetDir, { recursive: true });
    await copyFile(sourceFile, targetFile);

    console.log(`✓ Skills installed to ${targetDir}/SKILL.md`);
    console.log('\nYou can now use the schema-mcp skill to extract and manage database schemas.');
  } catch (error) {
    console.error('Failed to install skills:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  installSkills();
}
