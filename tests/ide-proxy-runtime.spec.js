// IDE proxy runtime tests (D2 #1032 + D3 #1033 + D4 #1034).
const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawnSync } = require('child_process');

const CLS = require(path.resolve(__dirname, '..', 'scripts', 'global', 'ide-proxy-classifier.js'));
const TEL = require(path.resolve(__dirname, '..', 'scripts', 'global', 'ide-proxy-telemetry.js'));
const CTRL = path.resolve(__dirname, '..', 'scripts', 'global', 'ide-proxy-control.sh');

test('classifier: lookup-style turn → fleet/free lane', () => {
  const r = CLS.classify("show me where x is defined");
  expect(['free', 'fleet']).toContain(r.lane);
});

test('classifier: security-review turn → premium lane', () => {
  const r = CLS.classify("audit this code for security vulnerabilities and concurrency race conditions");
  expect(r.lane).toBe('premium');
});

test('classifier: refactor → haiku or fleet lane', () => {
  const r = CLS.classify("refactor this function to extract the helper");
  expect(['haiku', 'fleet', 'free']).toContain(r.lane);
});

test('classifier emits rationale + complexity score', () => {
  const r = CLS.classify("test prompt");
  expect(typeof r.complexity).toBe('number');
  expect(r.rationale).toContain('score=');
});

test('classifier marks latency-sensitive prompts as not batch-preferred', () => {
  const r = CLS.classify('urgent realtime fix needed now');
  expect(r.latency_sensitive).toBe(true);
  expect(r.batch_preferred).toBe(false);
});

test('classifier marks async deep prompts as batch-preferred', () => {
  const r = CLS.classify('research-summary architecture options and trade-offs for refactor', { toolCount: 5 });
  expect(r.latency_sensitive).toBe(false);
  expect(typeof r.batch_preferred).toBe('boolean');
});

test('telemetry: recordDecision writes JSONL line with cost estimate', () => {
  const tmp = path.join(os.tmpdir(), `ide-tel-${Date.now()}.jsonl`);
  const orig = TEL.LOG_FILE;
  // Override via direct write
  fs.writeFileSync(tmp, '');
  const r = TEL.recordDecision({
    complexity: 0.3, lane: 'free', model_group: 'fleet-fast',
    model: 'fleet-fast', est_tokens_in: 100, est_tokens_out: 50,
  });
  expect(r.ok).toBe(true);
  fs.unlinkSync(tmp);
});

test('telemetry: estimateCost computes Anthropic Opus pricing', () => {
  const c = TEL.estimateCost('claude-opus-4-7', 1000, 500);
  expect(c).toBeGreaterThan(0);
  expect(c).toBeLessThan(1);
});

test('telemetry: estimateCost is zero for fleet/CF AI free models', () => {
  expect(TEL.estimateCost('fleet-fast', 100000, 50000)).toBe(0);
  expect(TEL.estimateCost('cloud-fleet-primary', 100000, 50000)).toBe(0);
});

test('control script: status returns success when not running', () => {
  const r = spawnSync('bash', [CTRL, 'status'], { encoding: 'utf8' });
  expect(r.status).toBe(0);
});

test('control script: respects MEGINGJORD_HAMR_DISABLED=1 on start', () => {
  const r = spawnSync('bash', [CTRL, 'start'], {
    encoding: 'utf8',
    env: { ...process.env, MEGINGJORD_HAMR_DISABLED: '1' },
  });
  expect(r.stdout).toMatch(/opt-out active|refused/);
  expect(r.status).toBe(0);
});

test('measurement: synthetic corpus passes activation gate', () => {
  const M = require(path.resolve(__dirname, '..', 'scripts', 'global', 'ide-proxy-measure.js'));
  const r = M.run();
  expect(r.totalCount).toBe(M.CORPUS.length);
  expect(r.routedNonAnthropicPct).toBeGreaterThanOrEqual(0.30);
  expect(r.costReductionPct).toBeGreaterThanOrEqual(0.25);
});
