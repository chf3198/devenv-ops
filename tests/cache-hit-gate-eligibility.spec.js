'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { computeHitRate, runGate } = require('../scripts/global/cache-hit-gate.js');
const { isCacheEligible, CACHE_ELIGIBLE_MIN_INPUT_TOKENS } = require('../scripts/global/cache-stats-emit.js');

const NOW = Date.now();
const RECENT = NOW - 60 * 60 * 1000;

test('isCacheEligible: large request eligible by input size', () => {
  assert.equal(isCacheEligible({ input_tokens: 100, cache_read_tokens: 0 }), true);
});

test('isCacheEligible: tiny request not eligible', () => {
  assert.equal(isCacheEligible({ input_tokens: 10, cache_read_tokens: 0 }), false);
});

test('isCacheEligible: cache hit always eligible regardless of size', () => {
  assert.equal(isCacheEligible({ input_tokens: 5, cache_read_tokens: 5 }), true);
});

test('CACHE_ELIGIBLE_MIN_INPUT_TOKENS sane default', () => {
  assert.equal(CACHE_ELIGIBLE_MIN_INPUT_TOKENS, 50);
});

test('computeHitRate skips tiny non-caching providers (groq)', () => {
  const records = [
    { ts: RECENT, provider: 'groq', input_tokens: 10, cache_read_tokens: 0 },
    { ts: RECENT, provider: 'anthropic', input_tokens: 1000, cache_read_tokens: 850 },
  ];
  const r = computeHitRate(records);
  assert.equal(r.skipped_noncaching, 1);
  assert.equal(r.sample_count, 1);
  assert.equal(r.hit_rate, 0.85);
});

test('computeHitRate skips below-threshold input regardless of caching provider', () => {
  const records = [
    { ts: RECENT, provider: 'anthropic', input_tokens: 10, cache_read_tokens: 0 },
    { ts: RECENT, provider: 'anthropic', input_tokens: 1000, cache_read_tokens: 850 },
  ];
  const r = computeHitRate(records);
  assert.equal(r.skipped_ineligible, 1);
  assert.equal(r.sample_count, 1);
});

test('computeHitRate honors cache_eligible flag when present', () => {
  const records = [
    { ts: RECENT, provider: 'anthropic', input_tokens: 1000, cache_read_tokens: 0, cache_eligible: false },
    { ts: RECENT, provider: 'anthropic', input_tokens: 1000, cache_read_tokens: 850, cache_eligible: true },
  ];
  const r = computeHitRate(records);
  assert.equal(r.skipped_ineligible, 1);
  assert.equal(r.sample_count, 1);
});

test('runGate returns no_samples_in_window when empty', () => {
  const r = runGate({ file: '/dev/null', floor: 0.8 });
  assert.equal(r.passed, false);
  assert.equal(r.alert, 'no_samples_in_window');
});
