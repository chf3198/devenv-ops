#!/usr/bin/env node
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { parsePorcelain, recommendation } = require('../scripts/global/worktree-inventory');

const RAW = `worktree /repo
HEAD abc
branch refs/heads/main

worktree /repo-agent
HEAD def
branch refs/heads/feat/123-work
locked agent active

worktree /repo-old
HEAD 111
prunable gitdir file points to non-existent location`;

test('worktree inventory parses porcelain entries', () => {
  assert.deepStrictEqual(parsePorcelain(RAW), [
    { path: '/repo', head: 'abc', branch: 'main', locked: false, prunable: false },
    { path: '/repo-agent', head: 'def', branch: 'feat/123-work', locked: true, prunable: false },
    { path: '/repo-old', head: '111', locked: false, prunable: true },
  ]);
});

test('worktree inventory classifies safe read-only actions', () => {
  assert.strictEqual(recommendation({ locked: true }), 'keep-locked');
  assert.strictEqual(recommendation({ prunable: true }), 'prune-metadata');
  assert.strictEqual(recommendation({ dirtyCount: 2, branch: 'feat/x' }), 'review-dirty');
  assert.strictEqual(recommendation({ dirtyCount: 0 }), 'review-detached');
  assert.strictEqual(recommendation({ dirtyCount: 0, branch: 'main' }), 'keep-main');
  assert.strictEqual(recommendation({ dirtyCount: 0, branch: 'sandbox/codex', mergedToMain: true }), 'keep-active');
  assert.strictEqual(recommendation({ dirtyCount: 0, branch: 'feat/x', mergedToMain: true }), 'remove-after-merge');
  assert.strictEqual(recommendation({ dirtyCount: 0, branch: 'feat/x', mergedToMain: false }), 'keep-active');
});
