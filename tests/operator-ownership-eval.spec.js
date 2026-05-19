'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { buildCorpus, score, CATEGORIES } = require('../scripts/global/operator-ownership-eval');

test('corpus satisfies minimum size and categories', () => {
  const corpus = buildCorpus();
  const adversarial = corpus.filter(x => x.expected === 'block');
  const safe = corpus.filter(x => x.expected === 'allow');
  assert.ok(corpus.length >= 200);
  assert.ok(adversarial.length >= 200);
  assert.ok(safe.length >= 40);
  assert.equal(CATEGORIES.length, 7);
});

test('scoring returns bounded metrics', () => {
  const metrics = score(buildCorpus());
  assert.ok(metrics.precision >= 0 && metrics.precision <= 1);
  assert.ok(metrics.recall >= 0 && metrics.recall <= 1);
  assert.ok(metrics.f1 >= 0 && metrics.f1 <= 1);
});
