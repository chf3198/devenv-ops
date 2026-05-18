'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { render, fmtJson, fmtHuman, fmtMarkdown }
  = require('../scripts/global/harness-self-test-reporters.js');

const SAMPLE = [
  { check: { id: 'a', name: 'A capability', category: 'capability',
    expected: 'pass', fail_recommend: 'try X' },
    result: { passed: true, observed: '', diagnosis: 'pass', exitCode: 0, elapsedMs: 10 } },
  { check: { id: 'b', name: 'B regression', category: 'regression',
    expected: 'pass', fail_recommend: 'try Y' },
    result: { passed: false, observed: 'error xyz', diagnosis: 'check-failed',
      exitCode: 1, elapsedMs: 20 } },
];
const SUMMARY = { total: 2, passed_count: 1, failed_count: 1, elapsed_ms: 30, exit_code: 1 };

test('fmtJson: structured per-check tuples (AC2)', () => {
  const out = JSON.parse(fmtJson(SAMPLE, SUMMARY));
  assert.equal(out.summary.total, 2);
  assert.equal(out.checks.length, 2);
  assert.equal(out.checks[0].id, 'a');
  assert.equal(out.checks[1].recommend_action, 'try Y');
  assert.equal(out.checks[0].recommend_action, null);
});

test('fmtJson: every fail carries recommend_action (AC2)', () => {
  const out = JSON.parse(fmtJson(SAMPLE, SUMMARY));
  const fails = out.checks.filter(c => !c.passed);
  assert.ok(fails.every(c => c.recommend_action !== null && c.recommend_action !== ''));
});

test('fmtMarkdown: table with pass/fail marks', () => {
  const md = fmtMarkdown(SAMPLE, SUMMARY);
  assert.match(md, /\| ✓ \| `a` \|/);
  assert.match(md, /\| ✗ \| `b` \|/);
  assert.match(md, /1\/2 pass/);
});

test('fmtHuman: capability/regression sections separated (AC3)', () => {
  const human = fmtHuman(SAMPLE, SUMMARY);
  assert.match(human, /capability/);
  assert.match(human, /regression/);
  assert.match(human, /try Y/);
});

test('render dispatches by format', () => {
  assert.match(render(SAMPLE, SUMMARY, 'json'), /"checks":/);
  assert.match(render(SAMPLE, SUMMARY, 'markdown'), /^# Harness self-test/);
  assert.match(render(SAMPLE, SUMMARY, 'human'), /pass/);
});
