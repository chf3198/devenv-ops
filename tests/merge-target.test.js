#!/usr/bin/env node
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { checkMergeTarget } = require('../scripts/global/phase-gate');

test('merge-target: release branches must target main', () => {
  const result = checkMergeTarget('main', 'release/v1.2.3', 1250);
  assert.strictEqual(result.length, 0, 'release → main should pass');
  
  const fail = checkMergeTarget('sandbox', 'release/v1.2.3', 1250);
  assert.strictEqual(fail.length, 1, 'release → sandbox should fail');
  assert.match(fail[0], /release branches must target main/);
});

test('merge-target: hotfix branches must target main', () => {
  const result = checkMergeTarget('main', 'hotfix/security-patch', 1250);
  assert.strictEqual(result.length, 0, 'hotfix → main should pass');
  
  const fail = checkMergeTarget('develop', 'hotfix/security-patch', 1250);
  assert.strictEqual(fail.length, 1, 'hotfix → non-main should fail');
});

test('merge-target: sandbox branches must target sandbox', () => {
  const result = checkMergeTarget('sandbox', 'sandbox/test-feature', 1250);
  assert.strictEqual(result.length, 0, 'sandbox/... → sandbox should pass');
  
  const fail = checkMergeTarget('main', 'sandbox/test-feature', 1250);
  assert.strictEqual(fail.length, 1, 'sandbox/... → main should fail');
  assert.match(fail[0], /sandbox branches must target sandbox/);
});

test('merge-target: feature branches have no strict requirement', () => {
  const result1 = checkMergeTarget('main', 'feat/new-feature', 1250);
  assert.strictEqual(result1.length, 0, 'feat → main allowed');
  
  const result2 = checkMergeTarget('develop', 'feat/new-feature', 1250);
  assert.strictEqual(result2.length, 0, 'feat → develop allowed');
  
  const result3 = checkMergeTarget('sandbox', 'feat/experiment', 1250);
  assert.strictEqual(result3.length, 0, 'feat → sandbox allowed');
});

test('merge-target: fix branches have no strict requirement', () => {
  const result1 = checkMergeTarget('main', 'fix/typo', 1250);
  assert.strictEqual(result1.length, 0, 'fix → main allowed');
  
  const result2 = checkMergeTarget('develop', 'fix/logic-error', 1250);
  assert.strictEqual(result2.length, 0, 'fix → develop allowed');
});

test('merge-target: unknown prefixes have no requirement', () => {
  const result = checkMergeTarget('main', 'docs/update-readme', 1250);
  assert.strictEqual(result.length, 0, 'docs prefix allowed to any target');
});
