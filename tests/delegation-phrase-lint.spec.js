'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { isProhibition, direct, heuristic } = require('../scripts/global/delegation-phrase-lint');

test('prohibition text is excluded', () => {
  assert.equal(isProhibition('never ask the user to run commands'), true);
  assert.equal(heuristic('never ask the user to run commands'), false);
});

test('direct delegation phrases are detected', () => {
  assert.equal(direct('the user must run this yourself'), true);
  assert.equal(direct('please manually install this'), true);
});

test('paraphrased delegation patterns are detected', () => {
  assert.equal(heuristic('client should execute deploy now'), true);
  assert.equal(heuristic('policy says operator executes steps'), false);
});
