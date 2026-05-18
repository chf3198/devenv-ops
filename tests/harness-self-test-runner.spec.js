'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { runOne, runAll, diagnose, isShortCircuitFailure }
  = require('../scripts/global/harness-self-test-runner.js');

test('runOne pass: zero exit + observed captured', () => {
  const check = { id: 'ok', name: 'ok', command: 'echo hello', expected: 'ok' };
  const r = runOne(check);
  assert.equal(r.passed, true);
  assert.equal(r.exitCode, 0);
  assert.match(r.observed, /hello/);
  assert.equal(r.diagnosis, 'pass');
});

test('runOne fail: non-zero exit + diagnosis check-failed', () => {
  const check = { id: 'fail', name: 'fail', command: 'false', expected: 'pass' };
  const r = runOne(check);
  assert.equal(r.passed, false);
  assert.notEqual(r.exitCode, 0);
  assert.equal(r.diagnosis, 'check-failed');
});

test('diagnose: pass shortcut', () => {
  assert.equal(diagnose({ id: 'x' }, true, ''), 'pass');
});

test('diagnose: network error', () => {
  assert.equal(diagnose({ id: 'x' }, false, 'fetch failed: ECONNREFUSED'), 'network-unreachable');
});

test('diagnose: permissions error', () => {
  assert.equal(diagnose({ id: 'x' }, false, 'EACCES: permission denied'), 'permissions-error');
});

test('diagnose: missing file', () => {
  assert.equal(diagnose({ id: 'x' }, false, 'ENOENT: no such file'), 'missing-file');
});

test('diagnose: step0 runtime-stale signal', () => {
  assert.equal(diagnose({ id: 'step0-hook-parity' }, false, 'runtime-stale'),
    'runtime-stale');
});

test('isShortCircuitFailure honors short_circuit_on_fail flag', () => {
  const check = { short_circuit_on_fail: true };
  assert.equal(isShortCircuitFailure(check, { passed: false }), true);
  assert.equal(isShortCircuitFailure(check, { passed: true }), false);
});

test('isShortCircuitFailure ignores flag absence', () => {
  assert.equal(isShortCircuitFailure({}, { passed: false }), false);
});

test('runAll: short-circuit skips downstream checks', () => {
  const checks = [
    { id: 'gate', name: 'gate', command: 'false', expected: 'pass',
      short_circuit_on_fail: true },
    { id: 'downstream', name: 'downstream', command: 'echo never-runs', expected: 'pass' },
  ];
  const r = runAll(checks);
  assert.equal(r[0].result.passed, false);
  assert.equal(r[1].result.passed, false);
  assert.equal(r[1].result.diagnosis, 'skipped-short-circuit');
});

test('runAll: adapter exemption returns synthetic pass', () => {
  const checks = [{ id: 'no-hooks', name: 'no-hooks', command: 'false', expected: 'pass' }];
  const r = runAll(checks, { adapter: 'claude-code',
    exemptions: { 'claude-code': { exempt_checks: ['no-hooks'] } } });
  assert.equal(r[0].result.passed, true);
  assert.equal(r[0].result.diagnosis, 'adapter-exempt');
});

test('runAll: both checks run when no short-circuit', () => {
  const checks = [
    { id: 'a', name: 'a', command: 'echo a', expected: 'pass' },
    { id: 'b', name: 'b', command: 'echo b', expected: 'pass' },
  ];
  const r = runAll(checks);
  assert.equal(r.length, 2);
  assert.ok(r.every(x => x.result.passed));
});
