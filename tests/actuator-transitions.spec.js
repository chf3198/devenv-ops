'use strict';
// actuator-transitions (#1113 AC4 strengthening) — velocity-relative
// de-escalation: N consecutive clean readings before clear (not calendar).
const test = require('node:test');
const assert = require('node:assert/strict');
const { applyTransition, DEFAULT_CONSECUTIVE_CLEAN } =
  require('../scripts/global/actuator-transitions.js');

const NOW = '2026-05-18T16:00:00.000Z';
const INIT = { escalated_at: null, deescalation_eligible_at: null, consecutive_clean_count: 0 };

test('escalation: sets escalated_at and resets clean counter', () => {
  const next = applyTransition(INIT, true, NOW, { tier: 'B++' });
  assert.equal(next.escalated_at, NOW);
  assert.equal(next.consecutive_clean_count, 0);
  assert.equal(next.tier, 'B++');
});

test('escalation: preserves existing escalated_at when re-escalating', () => {
  const prev = { ...INIT, escalated_at: '2026-05-17T00:00:00.000Z', consecutive_clean_count: 2 };
  const next = applyTransition(prev, true, NOW, { tier: 'B+++' });
  assert.equal(next.escalated_at, '2026-05-17T00:00:00.000Z');
  assert.equal(next.consecutive_clean_count, 0, 'partial cleans reset on re-escalation');
});

test('clean reading below threshold: increments counter but stays escalated', () => {
  const prev = { ...INIT, escalated_at: NOW, consecutive_clean_count: 0 };
  let cur = prev;
  for (let i = 1; i < DEFAULT_CONSECUTIVE_CLEAN; i += 1) {
    cur = applyTransition(cur, false, NOW, { tier: 'B' });
    assert.equal(cur.escalated_at, NOW, `iter ${i} still escalated`);
    assert.equal(cur.consecutive_clean_count, i);
  }
});

test('clean readings: de-escalates after N consecutive', () => {
  const prev = { ...INIT, escalated_at: NOW, consecutive_clean_count: 0 };
  let cur = prev;
  for (let i = 0; i < DEFAULT_CONSECUTIVE_CLEAN; i += 1) {
    cur = applyTransition(cur, false, NOW, { tier: 'B' });
  }
  assert.equal(cur.escalated_at, null, 'cleared after N clean');
  assert.equal(cur.deescalation_eligible_at, NOW);
  assert.equal(cur.consecutive_clean_count, 0, 'counter reset after de-escalation');
});

test('clean reading when not escalated: tracks counter for future escalation reset', () => {
  const next = applyTransition(INIT, false, NOW, { tier: 'B' });
  assert.equal(next.escalated_at, null);
  assert.equal(next.consecutive_clean_count, 1);
  assert.equal(next.deescalation_eligible_at, null);
});

test('custom threshold honored via opts', () => {
  const prev = { ...INIT, escalated_at: NOW, consecutive_clean_count: 0 };
  let cur = prev;
  cur = applyTransition(cur, false, NOW, {}, { consecutiveCleanThreshold: 2 });
  assert.equal(cur.escalated_at, NOW);
  cur = applyTransition(cur, false, NOW, {}, { consecutiveCleanThreshold: 2 });
  assert.equal(cur.escalated_at, null);
});

test('DEFAULT_CONSECUTIVE_CLEAN is sane', () => {
  assert.ok(DEFAULT_CONSECUTIVE_CLEAN >= 3 && DEFAULT_CONSECUTIVE_CLEAN <= 10);
});
