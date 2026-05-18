'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const { test } = require('node:test');
const { loadRegistry, filterByCategory, parseArgs, detectAdapter }
  = require('../scripts/global/harness-self-test.js');

test('loadRegistry returns v1 registry with checks + exemptions', () => {
  const r = loadRegistry();
  assert.equal(r.version, 'v1.0');
  assert.ok(Array.isArray(r.checks));
  assert.ok(r.checks.length >= 5);
  assert.ok(r.adapter_exemptions);
});

test('every registered check carries (id, name, category, expected, command, fail_recommend) — AC2', () => {
  const r = loadRegistry();
  for (const c of r.checks) {
    assert.ok(c.id, `check missing id`);
    assert.ok(c.name, `${c.id} missing name`);
    assert.ok(['capability', 'regression'].includes(c.category), `${c.id} invalid category`);
    assert.ok(c.expected, `${c.id} missing expected`);
    assert.ok(c.command, `${c.id} missing command`);
    assert.ok(c.fail_recommend, `${c.id} missing fail_recommend (AC2 violation)`);
  }
});

test('registry includes step0-hook-parity check (AC4)', () => {
  const r = loadRegistry();
  const step0 = r.checks.find(c => c.id === 'step0-hook-parity');
  assert.ok(step0, 'step0-hook-parity check missing');
  assert.equal(step0.short_circuit_on_fail, true);
});

test('filterByCategory: capability mode returns capability checks only', () => {
  const r = loadRegistry();
  const cap = filterByCategory(r.checks, 'capability');
  assert.ok(cap.every(c => c.category === 'capability'));
});

test('filterByCategory: regression mode returns regression checks only', () => {
  const r = loadRegistry();
  const reg = filterByCategory(r.checks, 'regression');
  assert.ok(reg.every(c => c.category === 'regression'));
});

test('filterByCategory: both mode returns all checks', () => {
  const r = loadRegistry();
  assert.equal(filterByCategory(r.checks, 'both').length, r.checks.length);
});

test('parseArgs: defaults to both/human/with-telemetry', () => {
  const a = parseArgs([]);
  assert.equal(a.mode, 'both');
  assert.equal(a.format, 'human');
  assert.equal(a.noTelemetry, false);
});

test('parseArgs: --capability + --json + --no-telemetry', () => {
  const a = parseArgs(['--capability', '--json', '--no-telemetry']);
  assert.equal(a.mode, 'capability');
  assert.equal(a.format, 'json');
  assert.equal(a.noTelemetry, true);
});

test('parseArgs: --regression + --markdown', () => {
  const a = parseArgs(['--regression', '--markdown']);
  assert.equal(a.mode, 'regression');
  assert.equal(a.format, 'markdown');
});

test('detectAdapter: respects MEGINGJORD_ADAPTER env override', () => {
  const prior = process.env.MEGINGJORD_ADAPTER;
  process.env.MEGINGJORD_ADAPTER = 'codex';
  try { assert.equal(detectAdapter(), 'codex'); }
  finally { if (prior == null) delete process.env.MEGINGJORD_ADAPTER;
    else process.env.MEGINGJORD_ADAPTER = prior; }
});

test('registry adapter_exemptions covers claude-code, copilot, codex (AC6)', () => {
  const r = loadRegistry();
  for (const team of ['claude-code', 'copilot', 'codex']) {
    assert.ok(r.adapter_exemptions[team], `${team} adapter exemption missing`);
  }
});
