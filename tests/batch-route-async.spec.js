'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { isAsyncEligibleWorkItem, summarizeAsyncBatchConversion, estimateBlendedSavings }
  = require('../scripts/global/batch-route.js');

test('isAsyncEligibleWorkItem: latency-sensitive request rejected', () => {
  const r = isAsyncEligibleWorkItem({ kind: 'wiki-anneal', deadlineMs: 24 * 60 * 60 * 1000,
    latencySensitive: true });
  assert.equal(r.eligible, false);
  assert.equal(r.reason, 'latency_sensitive');
});

test('isAsyncEligibleWorkItem: non-latency eligible kind accepted', () => {
  const r = isAsyncEligibleWorkItem({ kind: 'wiki-anneal', deadlineMs: 24 * 60 * 60 * 1000 });
  assert.equal(r.eligible, true);
  assert.equal(r.reason, 'async_eligible');
});

test('isAsyncEligibleWorkItem: ineligible kind rejected with base reason', () => {
  const r = isAsyncEligibleWorkItem({ kind: 'interactive', deadlineMs: 1000 });
  assert.equal(r.eligible, false);
  assert.notEqual(r.reason, 'async_eligible');
});

test('summarizeAsyncBatchConversion: computes conversionRate >= 60% for cohort', () => {
  const items = [];
  for (let i = 0; i < 7; i++) items.push({ kind: 'wiki-anneal', deadlineMs: 24 * 60 * 60 * 1000 });
  for (let i = 0; i < 3; i++) items.push({ kind: 'wiki-anneal', deadlineMs: 1000 });
  const s = summarizeAsyncBatchConversion(items);
  assert.equal(s.totalItems, 10);
  assert.equal(s.eligibleCount, 7);
  assert.ok(s.conversionRate >= 0.6);
});

test('summarizeAsyncBatchConversion: empty list safe', () => {
  const s = summarizeAsyncBatchConversion([]);
  assert.equal(s.totalItems, 0);
  assert.equal(s.eligibleCount, 0);
});

test('estimateBlendedSavings: 60% conversion at 50% discount yields 30%', () => {
  assert.equal(estimateBlendedSavings(0.6, 0.5), 0.3);
});

test('estimateBlendedSavings: clamps invalid inputs', () => {
  assert.equal(estimateBlendedSavings(1.5, 0.5), 0.5);
  assert.equal(estimateBlendedSavings(-0.1, 0.5), 0);
});

test('estimateBlendedSavings: default discount 0.5', () => {
  assert.equal(estimateBlendedSavings(0.8), 0.4);
});
