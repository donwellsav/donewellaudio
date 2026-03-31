/**
 * PostToolUse hook: Auto-adds .docx files to .gitignore when created via Write.
 * Prevents accidental commits of generated Word documents.
 */
import { readFileSync, appendFileSync } from 'fs';
import { resolve } from 'path';

const input = JSON.parse(process.argv[2] || '{}');
const filePath = input?.tool_input?.file_path || '';

if (!filePath.endsWith('.docx')) process.exit(0);

const gitignorePath = resolve('.gitignore');
try {
  const content = readFileSync(gitignorePath, 'utf8');
  const relativePath = filePath.replace(/\\/g, '/').replace(/^.*?(?=docs\/)/, '');

  // Check if this specific file or its pattern is already ignored
  if (content.includes(relativePath) || content.includes('docs/*.docx')) {
    process.exit(0);
  }

  // File not ignored — it's covered by the existing docs/*.docx pattern
  // If that pattern somehow got removed, re-add it
  if (!content.includes('docs/*.docx')) {
    appendFileSync(gitignorePath, '\ndocs/*.docx\n');
    console.error(`[auto-gitignore] Added docs/*.docx to .gitignore`);
  }
} catch {
  // .gitignore doesn't exist or can't be read — skip silently
}
