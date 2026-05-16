#!/usr/bin/env node
'use strict';

const { listPages, parseFrontmatter, updateIndex } = require('./wiki-io');
const { computeWikiHealth } = require('./health-contract');

function titleFor(page) {
  const raw = require('node:fs').readFileSync(page.path, 'utf-8');
  const { frontmatter } = parseFrontmatter(raw);
  return frontmatter.title || page.slug;
}

function reindex() {
  const pages = listPages();
  for (const page of pages) updateIndex(page.slug, titleFor(page), page.type);
  const health = computeWikiHealth();
  console.log(JSON.stringify({ pages: health.pages, indexSync: health.indexSync.length }, null, 2));
  process.exit(health.indexSync.length <= 5 ? 0 : 1);
}

reindex();
