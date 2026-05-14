#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const catalogPath = path.join(root, 'instructions/governance-controls.instructions.md');
const scanRoots = ['instructions', 'scripts', '.github/workflows'];
const extOk = new Set(['.md', '.js', '.yml', '.yaml', '.json']);
const ignore = ['node_modules', '.git', '.dashboard', 'logs', 'test-results', 'playwright-report'];

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignore.includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (extOk.has(path.extname(e.name))) out.push(p);
  }
  return out;
}

function tokens(text) {
  return [...new Set((text.match(/\bGOV-\d{3}\b/g) || []))];
}

function getCatalogTokens() {
  const text = fs.readFileSync(catalogPath, 'utf8');
  return tokens(text);
}

function main() {
  const known = new Set(getCatalogTokens());
  const files = scanRoots.flatMap(d => walk(path.join(root, d))).filter(f => f !== catalogPath);
  const unresolved = [];
  for (const f of files) {
    const rel = path.relative(root, f);
    const found = tokens(fs.readFileSync(f, 'utf8'));
    for (const t of found) {
      if (!known.has(t)) unresolved.push(`${rel}: ${t}`);
    }
  }
  if (unresolved.length) {
    console.error('❌ Unresolved governance tokens:');
    for (const row of unresolved) console.error(`  - ${row}`);
    process.exit(1);
  }
  console.log(`✅ governance-token-lint: all GOV-* tokens resolve (${[...known].join(', ')})`);
}

if (require.main === module) main();

module.exports = { tokens };
