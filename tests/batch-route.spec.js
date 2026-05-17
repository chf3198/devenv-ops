// batch-route Stage 4 helper tests (#1067).
const { test, expect } = require('@playwright/test');
const path = require('path');
const BR = require(path.resolve(__dirname, '..', 'scripts', 'global', 'batch-route.js'));

test('routeWithBatch falls back to sync when no batchRequests provided', async () => {
  const r = await BR.routeWithBatch({ kind: 'wiki-anneal', deadlineMs: 24*3600*1000 },
    async () => ({ x: 1 }));
  expect(r.route).toBe('sync');
  expect(r.ok).toBe(true);
  expect(r.result.x).toBe(1);
});

test('routeWithBatch falls back to sync when ineligible (time-critical)', async () => {
  const r = await BR.routeWithBatch({ kind: 'interactive', deadlineMs: 60_000 },
    async () => ({ y: 2 }), [{ custom_id: 'x', params: {} }]);
  expect(r.route).toBe('sync');
  expect(r.eligibility.eligible).toBe(false);
});

test('routeWithBatch eligibility check passes for wiki-anneal with 24h deadline', async () => {
  const r = await BR.routeWithBatch({ kind: 'wiki-anneal', deadlineMs: 24*3600*1000 },
    async () => ({ smoke: true }));
  expect(r.eligibility.eligible).toBe(true);
});

test('DEFAULT_DEADLINE_MS is 24h', () => {
  expect(BR.DEFAULT_DEADLINE_MS).toBe(24 * 60 * 60 * 1000);
});

test('async-eligible classifier routes at least 60% to batch path', () => {
  const work = [
    { kind: 'wiki-anneal', deadlineMs: 24*3600*1000, latencySensitive: false },
    { kind: 'research-summary', deadlineMs: 24*3600*1000, latencySensitive: false },
    { kind: 'bundle-rebuild', deadlineMs: 24*3600*1000, latencySensitive: false },
    { kind: 'interactive', deadlineMs: 60_000, latencySensitive: true },
    { kind: 'rule-coverage-stage2b', deadlineMs: 24*3600*1000, latencySensitive: false },
  ];
  const stats = BR.summarizeAsyncBatchConversion(work);
  expect(stats.conversionRate).toBeGreaterThanOrEqual(0.60);
});

test('blended savings are at least 30% at 60% batch conversion', () => {
  const savings = BR.estimateBlendedSavings(0.60, 0.50);
  expect(savings).toBeGreaterThanOrEqual(0.30);
});
