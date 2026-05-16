#!/usr/bin/env node
// scripts/wiki/lint.js — Wiki structural health checker
// Fleet routing: local (no LLM needed — pure structural checks)
// Usage: node scripts/wiki/lint.js

const { computeWikiHealth } = require('./health-contract');

function lint() {
  const health = computeWikiHealth();
  if (health.pages === 0) {
    console.log('📋 Wiki is empty — nothing to lint.');
    process.exit(0);
  }
  printReport(health);
}

function printReport(health) {
  const sections = [
    ['🔗 Broken Wikilinks', health.broken],
    ['🏝️  Orphan Pages', health.orphans],
    ['📝 Missing Frontmatter', health.frontmatter],
    ['📇 Index Sync', health.indexSync],
  ];
  console.log(`\n📋 Wiki Lint Report — ${health.pages} pages scanned\n`);

  if (health.issues === 0) {
    console.log('✅ All checks pass. Wiki is healthy.\n');
    process.exit(0);
  }
  for (const [label, items] of sections) {
    if (items.length === 0) continue;
    console.log(`${label} (${items.length}):`);
    items.forEach((i) => console.log(`  - ${i}`));
    console.log();
  }

  console.log(`Total issues: ${health.issues}`);
  process.exit(1);
}

lint();
