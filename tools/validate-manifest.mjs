import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const manifestPath = path.join(root, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const missing = [];
const referenced = new Set();

for (const script of manifest.content_scripts ?? []) {
  for (const file of script.js ?? []) referenced.add(file);
  for (const file of script.css ?? []) referenced.add(file);
}

for (const block of manifest.web_accessible_resources ?? []) {
  for (const file of block.resources ?? []) referenced.add(file);
}

for (const file of referenced) {
  if (!fs.existsSync(path.join(root, file))) missing.push(file);
}

if (missing.length) {
  console.error('Missing manifest references:');
  for (const file of missing) console.error(`  - ${file}`);
  process.exit(1);
}

const jsFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && entry.name.endsWith('.js')) jsFiles.push(full);
  }
}
walk(path.join(root, 'src'));

for (const file of jsFiles) {
  execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
}

for (const dir of ['_locales']) {
  const base = path.join(root, dir);
  for (const locale of fs.readdirSync(base)) {
    const file = path.join(base, locale, 'messages.json');
    if (fs.existsSync(file)) JSON.parse(fs.readFileSync(file, 'utf8'));
  }
}

console.log(`Furina ${manifest.version}: validation passed.`);
console.log(`${jsFiles.length} JavaScript files passed syntax checks.`);
console.log(`${referenced.size} manifest runtime references exist.`);
