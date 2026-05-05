// batch-validator tests (#944).
const { test, expect } = require('@playwright/test');
const path = require('path');
const { spawnSync } = require('child_process');

const VAL = require(path.resolve(__dirname, '..', 'scripts', 'global', 'batch-validator.js'));
const SCRIPT = path.resolve(__dirname, '..', 'scripts', 'global', 'batch-validator.js');

test('buildSampleBatch returns 1-request payload with Haiku model', () => {
  const requests = VAL.buildSampleBatch();
  expect(requests).toHaveLength(1);
  expect(requests[0].params.model).toMatch(/haiku-4-5/);
  expect(requests[0].params.max_tokens).toBe(32);
});

test('dryRun returns mode:dry-run and zero operator cost', () => {
  const r = VAL.dryRun();
  expect(r.mode).toBe('dry-run');
  expect(r.operator_cost_usd).toBe(0);
  expect(r.would_submit_to).toMatch(/api\.anthropic\.com/);
  expect(r.expected_request_count).toBe(1);
  expect(r.ok).toBe(true);
});

test('CLI without flags runs dry-run and exits 0', () => {
  const result = spawnSync('node', [SCRIPT], { encoding: 'utf8' });
  expect(result.status).toBe(0);
  const parsed = JSON.parse(result.stdout);
  expect(parsed.mode).toBe('dry-run');
});

test('CLI --live without --operator-approved exits 1', () => {
  const result = spawnSync('node', [SCRIPT, '--live'], { encoding: 'utf8' });
  expect(result.status).toBe(1);
  expect(result.stderr).toMatch(/operator-approved/);
});

test('eligibility: wiki-anneal at 24h deadline = eligible', () => {
  const r = VAL.dryRun();
  expect(r.eligibility.eligible).toBe(true);
});
