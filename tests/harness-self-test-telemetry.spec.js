'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { buildEvent, emit, emitBatch, SERVICE }
  = require('../scripts/global/harness-self-test-telemetry.js');

const TMP = path.join(os.tmpdir(), 'harness-self-test-telemetry-spec.jsonl');

function cleanup() { try { fs.unlinkSync(TMP); } catch {} }

test('buildEvent: pass result → pass event with gen_ai.* namespace (AC5)', () => {
  const check = { id: 'demo', name: 'Demo', category: 'capability', expected: 'pass' };
  const event = buildEvent(check, { passed: true, observed: '', exitCode: 0, elapsedMs: 1 });
  assert.equal(event.event, 'harness-self-test.check.pass');
  assert.equal(event['gen_ai.system'], 'megingjord-harness');
  assert.equal(event['gen_ai.operation.name'], 'self_test_check');
  assert.equal(event['gen_ai.tool.name'], 'demo');
  assert.equal(event.recommend_action, null);
  assert.equal(event.version, 'v3');
  assert.equal(event.service, SERVICE);
});

test('buildEvent: fail result includes recommend_action (AC2/AC5)', () => {
  const check = { id: 'demo', name: 'Demo', category: 'regression', expected: 'pass',
    fail_recommend: 'run X' };
  const event = buildEvent(check, { passed: false, observed: 'error', exitCode: 1, elapsedMs: 1,
    diagnosis: 'check-failed' });
  assert.equal(event.event, 'harness-self-test.check.fail');
  assert.equal(event.recommend_action, 'run X');
  assert.equal(event.diagnosis, 'check-failed');
  assert.match(event._summary, /run X/);
});

test('buildEvent: redacts API key in observed (composes with log-redaction)', () => {
  const check = { id: 'demo', name: 'D', category: 'capability', expected: 'pass' };
  const event = buildEvent(check,
    { passed: false, observed: 'leaked: sk-ant-api03-abcdefghijklmnopqrstuvwxyz0123456789', exitCode: 1 });
  assert.doesNotMatch(event.observed, /sk-ant-api03-abcdefghij/);
});

test('emit writes JSONL line to file', () => {
  cleanup();
  const check = { id: 'demo', name: 'D', category: 'capability', expected: 'pass' };
  emit(check, { passed: true, observed: '', exitCode: 0, elapsedMs: 1 }, { file: TMP });
  const lines = fs.readFileSync(TMP, 'utf8').trim().split('\n');
  assert.equal(lines.length, 1);
  const parsed = JSON.parse(lines[0]);
  assert.equal(parsed.check_id, 'demo');
  cleanup();
});

test('emitBatch writes one line per check', () => {
  cleanup();
  const checks = [
    { check: { id: 'a', name: 'A', category: 'capability', expected: 'pass' },
      result: { passed: true, observed: '', exitCode: 0, elapsedMs: 1 } },
    { check: { id: 'b', name: 'B', category: 'regression', expected: 'pass' },
      result: { passed: false, observed: 'err', exitCode: 1, elapsedMs: 1 } },
  ];
  emitBatch(checks, { file: TMP });
  const lines = fs.readFileSync(TMP, 'utf8').trim().split('\n');
  assert.equal(lines.length, 2);
  assert.equal(JSON.parse(lines[0]).check_id, 'a');
  assert.equal(JSON.parse(lines[1]).check_id, 'b');
  cleanup();
});
