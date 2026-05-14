#!/usr/bin/env node
'use strict';
const { execSync } = require('child_process');

function sh(cmd, cwd) {
  try {
    return execSync(cmd, { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    return '';
  }
}

function parsePorcelain(raw) {
  return raw.split('\n\n').filter(Boolean).map(block => {
    const item = { locked: false, prunable: false };
    for (const line of block.split('\n')) {
      const [key, ...rest] = line.split(' ');
      const value = rest.join(' ');
      if (key === 'worktree') item.path = value;
      if (key === 'HEAD') item.head = value;
      if (key === 'branch') item.branch = value.replace('refs/heads/', '');
      if (key === 'locked') item.locked = true;
      if (key === 'prunable') item.prunable = true;
    }
    return item;
  });
}

function recommendation(entry) {
  if (entry.locked) return 'keep-locked';
  if (entry.prunable) return 'prune-metadata';
  if (entry.dirtyCount > 0) return 'review-dirty';
  if (!entry.branch) return 'review-detached';
  if (entry.branch === 'main') return 'keep-main';
  if (entry.branch.startsWith('sandbox/')) return 'keep-active';
  if (entry.mergedToMain) return 'remove-after-merge';
  return 'keep-active';
}

function enrich(entry) {
  const dirty = sh('git status --porcelain --untracked-files=all', entry.path);
  const upstream = sh('git rev-parse --abbrev-ref --symbolic-full-name @{u}', entry.path);
  const div = upstream ? sh(`git rev-list --left-right --count ${upstream}...HEAD`, entry.path) : '';
  const [behind = 0, ahead = 0] = div ? div.split(/\s+/).map(Number) : [null, null];
  const merged = entry.branch && entry.branch !== 'main'
    ? sh(`git merge-base --is-ancestor ${entry.head} origin/main && echo yes`, entry.path) === 'yes'
    : false;
  const enriched = {
    ...entry,
    dirtyCount: dirty ? dirty.split('\n').length : 0,
    upstream: upstream || null,
    ahead,
    behind,
    mergedToMain: merged,
  };
  return { ...enriched, action: recommendation(enriched) };
}

function inventory(raw = sh('git worktree list --porcelain')) {
  return {
    generatedAt: new Date().toISOString(),
    mode: 'read-only',
    worktrees: parsePorcelain(raw).map(enrich),
  };
}

function print(report, json) {
  if (json) return console.log(JSON.stringify(report, null, 2));
  for (const worktree of report.worktrees) {
    console.log(`${worktree.action.padEnd(18)} ${worktree.branch || 'DETACHED'} ${worktree.path}`);
  }
}

if (require.main === module) {
  const report = inventory();
  print(report, process.argv.includes('--json'));
}

module.exports = { inventory, parsePorcelain, recommendation };
