// scripts/wiki/health-contract.js — unified structural health model for wiki tools.
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { listPages, parseFrontmatter, WIKI_DIR } = require('./wiki-io');

const REQUIRED_FIELDS = ['title', 'type', 'created', 'status'];
const CATS = ['entities', 'concepts', 'sources', 'syntheses'];

function links(content) {
  return [...String(content).matchAll(/\[\[([^\]]+)\]\]/g)].map(m => m[1]);
}

function computeWikiHealth(pages = null) {
  const set = pages || listPages();
  const allSlugs = new Set(set.map(p => p.slug));
  const broken = []; const orphans = []; const frontmatter = []; const indexSync = [];
  const inbound = new Set();
  for (const page of set) {
    const raw = fs.readFileSync(page.path, 'utf-8');
    const { frontmatter: fm } = parseFrontmatter(raw);
    for (const field of REQUIRED_FIELDS) if (!fm[field]) frontmatter.push(`${page.slug}: missing '${field}'`);
    for (const target of links(raw)) {
      inbound.add(target);
      if (!allSlugs.has(target)) broken.push(`${page.slug}→${target}`);
    }
  }
  const indexPath = path.join(WIKI_DIR, 'index.md');
  const idx = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf-8') : '';
  for (const target of links(idx)) inbound.add(target);
  for (const slug of allSlugs) {
    if (!inbound.has(slug)) orphans.push(slug);
    if (!idx.includes(`[[${slug}]]`)) indexSync.push(slug);
  }
  return {
    loaded: true,
    pages: set.length,
    dirs: CATS.length,
    issues: broken.length + orphans.length + frontmatter.length + indexSync.length,
    broken, orphans, frontmatter, indexSync,
    lastCheck: new Date().toISOString(),
  };
}

module.exports = { computeWikiHealth, REQUIRED_FIELDS, CATS };
