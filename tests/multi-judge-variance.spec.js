'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { aggregate, classifierInputsFromAggregate, meanOf, stdevOf,
  agreementCoefficient, detectAdversarialDissent, ADVERSARIAL_DISSENT_DELTA }
  = require('../scripts/global/multi-judge-variance.js');

test('meanOf empty returns 0', () => {
  assert.equal(meanOf([]), 0);
});

test('meanOf computes average', () => {
  assert.ok(Math.abs(meanOf([0.5, 0.7, 0.9]) - 0.7) < 1e-9);
});

test('stdevOf single sample returns 0 (no variance)', () => {
  assert.equal(stdevOf([0.5]), 0);
});

test('stdevOf computes population stdev', () => {
  const s = stdevOf([0.0, 1.0]);
  assert.ok(Math.abs(s - 0.5) < 0.001);
});

test('agreementCoefficient identical scores returns ~1.0', () => {
  const a = agreementCoefficient([0.8, 0.8, 0.8]);
  assert.ok(Math.abs(a - 1.0) < 1e-9);
});

test('agreementCoefficient wide spread returns low value', () => {
  const a = agreementCoefficient([0.0, 0.5, 1.0]);
  assert.ok(a < 0.6);
});

test('detectAdversarialDissent fires when adversarial scores far below consensus', () => {
  const judges = [
    { persona: 'approving', score: 0.9 },
    { persona: 'balanced', score: 0.85 },
    { persona: 'adversarial', score: 0.5 },
  ];
  assert.equal(detectAdversarialDissent(judges), true);
});

test('detectAdversarialDissent does NOT fire when adversarial roughly agrees', () => {
  const judges = [
    { persona: 'approving', score: 0.85 },
    { persona: 'balanced', score: 0.8 },
    { persona: 'adversarial', score: 0.75 },
  ];
  assert.equal(detectAdversarialDissent(judges), false);
});

test('detectAdversarialDissent absent adversarial returns false', () => {
  const judges = [{ persona: 'approving', score: 0.5 }, { persona: 'balanced', score: 0.5 }];
  assert.equal(detectAdversarialDissent(judges), false);
});

test('ADVERSARIAL_DISSENT_DELTA is 0.25 (matches design)', () => {
  assert.equal(ADVERSARIAL_DISSENT_DELTA, 0.25);
});

test('aggregate empty returns safe zero structure', () => {
  const r = aggregate([]);
  assert.equal(r.n, 0);
  assert.equal(r.mean, 0);
  assert.equal(r.agreement, 1);
});

test('aggregate computes mean/stdev/agreement/family_count', () => {
  const judges = [
    { family: 'qwen', persona: 'approving', score: 0.8 },
    { family: 'llama', persona: 'balanced', score: 0.8 },
    { family: 'gemini', persona: 'adversarial', score: 0.8 },
  ];
  const r = aggregate(judges);
  assert.equal(r.n, 3);
  assert.equal(r.mean, 0.8);
  assert.equal(r.stdev, 0);
  assert.equal(r.agreement, 1);
  assert.equal(r.family_count, 3);
  assert.equal(r.adversarial_dissent, false);
});

test('aggregate flags adversarial_dissent on wide gap', () => {
  const judges = [
    { family: 'qwen', persona: 'approving', score: 0.95 },
    { family: 'llama', persona: 'balanced', score: 0.90 },
    { family: 'gemini', persona: 'adversarial', score: 0.40 },
  ];
  const r = aggregate(judges);
  assert.equal(r.adversarial_dissent, true);
  assert.ok(r.stdev > 0.2);
  assert.ok(r.agreement < 0.8);
});

test('classifierInputsFromAggregate exposes mean/confidence/agreement for review-score-classifier', () => {
  const agg = aggregate([
    { family: 'qwen', persona: 'approving', score: 0.7 },
    { family: 'llama', persona: 'balanced', score: 0.75 },
    { family: 'gemini', persona: 'adversarial', score: 0.65 },
  ]);
  const inputs = classifierInputsFromAggregate(agg);
  assert.equal(inputs.mean, agg.mean);
  assert.equal(inputs.confidence, agg.agreement);
  assert.equal(inputs.agreement, agg.agreement);
});
