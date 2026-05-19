'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { runMatrix, loadRules } = require('../scripts/global/operator-ownership-rules');

test('rules manifest has scoped files and assertions', () => {
  const rules = loadRules();
  assert.ok(rules.scopedFiles.length >= 1);
  assert.ok(rules.assertions.length >= 3);
});

test('ownership matrix passes on current docs set', () => {
  const result = runMatrix();
  assert.equal(result.ok, true, JSON.stringify(result.failed, null, 2));
});
