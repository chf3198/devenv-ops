#!/usr/bin/env node
// changelog-aggregate.js — Aggregate .changes/unreleased/*.md fragments into
// CHANGELOG.md. Eliminates merge-conflict surface on the shared CHANGELOG by
// having each PR write one isolated fragment file. Epic #1132.
//
// Usage: node scripts/global/changelog-aggregate.js [--dry-run] [--archive-to <dir>]
'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const FRAGMENTS_DIR = path.join(REPO_ROOT, '.changes', 'unreleased');
const CHANGELOG = path.join(REPO_ROOT, 'CHANGELOG.md');
const CHANGELOG_HEADER = '# Changelog';

function listFragments(dir = FRAGMENTS_DIR) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(name => name.endsWith('.md'))
    .map(name => ({ name, path: path.join(dir, name) }))
    .sort((a, b) => {
      // Sort by ticket number when filename is `<N>.md`; fallback to lex.
      const aNum = parseInt(a.name, 10);
      const bNum = parseInt(b.name, 10);
      if (Number.isFinite(aNum) && Number.isFinite(bNum)) return aNum - bNum;
      return a.name.localeCompare(b.name);
    });
}

function readFragment(fragment) {
  const content = fs.readFileSync(fragment.path, 'utf-8').trim();
  return content;
}

function buildAggregatedSection(fragments) {
  if (fragments.length === 0) return '';
  const blocks = fragments.map(readFragment).filter(block => block.length > 0);
  return blocks.join('\n\n') + '\n\n';
}

function prependToChangelog(aggregated, changelogPath = CHANGELOG) {
  const current = fs.existsSync(changelogPath) ? fs.readFileSync(changelogPath, 'utf-8') : CHANGELOG_HEADER + '\n\n';
  if (!current.startsWith(CHANGELOG_HEADER)) {
    throw new Error(`CHANGELOG.md missing header "${CHANGELOG_HEADER}"`);
  }
  const headerLen = CHANGELOG_HEADER.length;
  const afterHeader = current.slice(headerLen).replace(/^\s*/, '');
  return `${CHANGELOG_HEADER}\n\n${aggregated}${afterHeader}`;
}

function archiveFragments(fragments, archiveDir) {
  if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir, { recursive: true });
  for (const fragment of fragments) {
    fs.renameSync(fragment.path, path.join(archiveDir, fragment.name));
  }
}

function deleteFragments(fragments) {
  for (const fragment of fragments) {
    fs.unlinkSync(fragment.path);
  }
}

function aggregate(opts = {}) {
  const fragments = listFragments(opts.dir || FRAGMENTS_DIR);
  if (fragments.length === 0) return { count: 0, fragments: [], skipped: 'empty' };
  const aggregated = buildAggregatedSection(fragments);
  const newChangelog = prependToChangelog(aggregated, opts.changelog || CHANGELOG);
  if (opts.dryRun) {
    return { count: fragments.length, fragments, preview: aggregated, dryRun: true };
  }
  fs.writeFileSync(opts.changelog || CHANGELOG, newChangelog, 'utf-8');
  if (opts.archiveTo) archiveFragments(fragments, opts.archiveTo);
  else deleteFragments(fragments);
  return { count: fragments.length, fragments: fragments.map(f => f.name) };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const archiveIdx = args.indexOf('--archive-to');
  const archiveTo = archiveIdx >= 0 ? args[archiveIdx + 1] : null;
  const result = aggregate({ dryRun, archiveTo });
  console.log(JSON.stringify(result, null, 2));
}

module.exports = {
  aggregate, listFragments, buildAggregatedSection, prependToChangelog,
  FRAGMENTS_DIR, CHANGELOG, CHANGELOG_HEADER,
};
