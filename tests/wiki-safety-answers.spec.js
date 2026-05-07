// Wiki write-safety + answer-tier tests (#871 + #1017).
const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const os = require('os');
const W = require(path.resolve(__dirname, '..', 'scripts', 'wiki', 'write-safety.js'));
const A = require(path.resolve(__dirname, '..', 'scripts', 'wiki', 'answer.js'));

const PROV = { author: 'test', team: 'claude-code', model: 'opus-4-7',
  agent_role: 'collaborator', commit: 'abc123' };

test('write-safety constants documented', () => {
  expect(W.LOCK_TTL_MS).toBe(5 * 60 * 1000);
  expect(W.PROVENANCE_FIELDS).toContain('author');
  expect(W.PROVENANCE_FIELDS).toContain('team');
});

test('validateProvenance rejects missing fields', () => {
  expect(W.validateProvenance({}).ok).toBe(false);
  expect(W.validateProvenance({}).missing.length).toBeGreaterThan(0);
});

test('validateProvenance accepts complete fields', () => {
  expect(W.validateProvenance(PROV).ok).toBe(true);
});

test('lockKey is deterministic 16-char hash', () => {
  expect(W.lockKey('test-slug').length).toBe(16);
  expect(W.lockKey('test-slug')).toBe(W.lockKey('test-slug'));
});

test('acquireLock + releaseLock work for unique slug', () => {
  const slug = `pw-test-${Date.now()}`;
  const acq = W.acquireLock(slug, PROV);
  expect(acq.ok).toBe(true);
  expect(fs.existsSync(acq.lockPath)).toBe(true);
  W.releaseLock(slug);
  expect(fs.existsSync(acq.lockPath)).toBe(false);
});

test('acquireLock blocks second-acquire within TTL', () => {
  const slug = `pw-block-${Date.now()}`;
  const first = W.acquireLock(slug, PROV);
  expect(first.ok).toBe(true);
  const second = W.acquireLock(slug, PROV);
  expect(second.ok).toBe(false);
  expect(second.reason).toBe('held');
  W.releaseLock(slug);
});

test('stampProvenance prepends provenance comment', () => {
  const result = W.stampProvenance('# Hello', PROV);
  expect(result.ok).toBe(true);
  expect(result.stamped).toContain('provenance');
  expect(result.stamped).toContain('# Hello');
});

test('answer slugify produces clean slug', () => {
  expect(A.slugify('What is HAMR?')).toBe('what-is-hamr');
  expect(A.slugify('Two   spaces')).toBe('two-spaces');
});

test('answer SLUG_MAX caps slug length', () => {
  expect(A.SLUG_MAX).toBe(80);
});
