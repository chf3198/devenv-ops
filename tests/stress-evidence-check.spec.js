'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { evaluate, advisoryComment, declaresStress, hasStressSpecInDiff,
  hasNpmInvocationInTrail, parseStrategies, STRESS_SPEC_PATTERN, NPM_INVOCATION }
  = require('../scripts/global/stress-evidence-check.js');

test('parseStrategies: empty input', () => {
  assert.deepEqual(parseStrategies(''), []);
});

test('parseStrategies: single strategy', () => {
  assert.deepEqual(parseStrategies('tdd-pyramid'), ['tdd-pyramid']);
});

test('parseStrategies: composable via plus-separator', () => {
  assert.deepEqual(parseStrategies('tdd-pyramid+stress-test').sort(),
    ['stress-test', 'tdd-pyramid']);
});

test('parseStrategies: comma-separated also accepted', () => {
  assert.deepEqual(parseStrategies('tdd-pyramid, stress-test').sort(),
    ['stress-test', 'tdd-pyramid']);
});

test('declaresStress: positive case', () => {
  assert.equal(declaresStress('test_strategy: tdd-pyramid+stress-test'), true);
});

test('declaresStress: negative case', () => {
  assert.equal(declaresStress('test_strategy: tdd-pyramid'), false);
});

test('declaresStress: no field returns false', () => {
  assert.equal(declaresStress('## MANAGER_HANDOFF\nscope: foo'), false);
});

test('STRESS_SPEC_PATTERN matches tests/stress-*.spec.js', () => {
  assert.ok(STRESS_SPEC_PATTERN.test('tests/stress-worktree-isolation.spec.js'));
  assert.ok(STRESS_SPEC_PATTERN.test('tests/stress-foo.spec.js'));
});

test('STRESS_SPEC_PATTERN rejects non-stress test files', () => {
  assert.equal(STRESS_SPEC_PATTERN.test('tests/worktree-foo.spec.js'), false);
  assert.equal(STRESS_SPEC_PATTERN.test('tests/stress-foo.js'), false);
});

test('hasStressSpecInDiff: positive', () => {
  assert.equal(hasStressSpecInDiff(['scripts/x.js', 'tests/stress-x.spec.js']), true);
});

test('hasStressSpecInDiff: negative', () => {
  assert.equal(hasStressSpecInDiff(['scripts/x.js', 'tests/x.spec.js']), false);
});

test('NPM_INVOCATION matches npm run stress:*', () => {
  assert.ok(NPM_INVOCATION.test('Ran: npm run stress:test'));
  assert.ok(NPM_INVOCATION.test('npm run stress:worktree'));
});

test('hasNpmInvocationInTrail: positive across multiple bodies', () => {
  assert.equal(hasNpmInvocationInTrail(['no match here', '... npm run stress:test ...']), true);
});

test('hasNpmInvocationInTrail: negative', () => {
  assert.equal(hasNpmInvocationInTrail(['nothing here', 'no stress invocation']), false);
});

test('evaluate: stress not declared returns N/A applicable=false', () => {
  const r = evaluate({ managerHandoff: 'test_strategy: tdd-pyramid' });
  assert.equal(r.ok, true);
  assert.equal(r.applicable, false);
});

test('evaluate: stress declared + spec in diff = ok', () => {
  const r = evaluate({
    managerHandoff: 'test_strategy: tdd-pyramid+stress-test',
    prFiles: ['scripts/global/foo.js', 'tests/stress-foo.spec.js'],
  });
  assert.equal(r.ok, true);
  assert.equal(r.evidence, 'stress-spec-in-diff');
});

test('evaluate: stress declared + npm invocation in handoff = ok', () => {
  const r = evaluate({
    managerHandoff: 'test_strategy: stress-test',
    prFiles: ['scripts/global/foo.js'],
    collabHandoff: 'Pre-handoff verification:\n- npm run stress:test: 31/31 pass',
  });
  assert.equal(r.ok, true);
  assert.equal(r.evidence, 'npm-run-stress-in-handoff');
});

test('evaluate: stress declared but no evidence = not-ok with rule', () => {
  const r = evaluate({
    managerHandoff: 'test_strategy: tdd-pyramid+stress-test',
    prFiles: ['scripts/global/foo.js'],
    collabHandoff: 'no stress here',
  });
  assert.equal(r.ok, false);
  assert.equal(r.rule, 'stress-evidence-missing');
});

test('advisoryComment: null when ok', () => {
  assert.equal(advisoryComment({ ok: true, applicable: false }, 1875), null);
});

test('advisoryComment: includes ticket + Epic #1875 + spec hint when not ok', () => {
  const comment = advisoryComment({ ok: false, applicable: true, rule: 'stress-evidence-missing' }, 1875);
  assert.match(comment, /Epic #1875/);
  assert.match(comment, /#1875/);
  assert.match(comment, /tests\/stress-/);
  assert.match(comment, /npm run stress:/);
});
