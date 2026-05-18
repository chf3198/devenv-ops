'use strict';
// ghs-feedback-loop (#1262 / Epic #1113 AC8) — synthetic governance-failure
// scenario validates the full GHS → actuator escalation → recovery →
// de-escalation feedback loop. N-iteration recovery (no calendar simulation
// per Epic #1771 lesson + memory feedback-calendar-thresholds-in-agentic-systems).

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { computeGHS } = require('../scripts/global/goal-health-score.js');
const { runEngine } = require('../scripts/global/actuator-engine.js');
const { DEFAULT_CONSECUTIVE_CLEAN } = require('../scripts/global/actuator-transitions.js');

function tempStore() {
  return path.join(os.tmpdir(), `ghs-feedback-loop-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
}

const HIGH_VIOLATION_SENSORS = { ga: 0.9, ll: 0.8, cf: 0.85, pr: 0.6, rp: 0.7, oo: 0 };
const CLEAN_SENSORS = { ga: 0.0, ll: 0.0, cf: 0.0, pr: 0.0, rp: 0.0, oo: 0 };

test('GHS feedback loop: escalation → N-iteration recovery → de-escalation', () => {
  const store = tempStore();
  const violationGHS = computeGHS({ sensorValues: HIGH_VIOLATION_SENSORS }).score;
  assert.ok(violationGHS < 0.35, `violation GHS should hit B++++ threshold; got ${violationGHS}`);
  let state = runEngine({ ghs: violationGHS, sensors: HIGH_VIOLATION_SENSORS }, store);
  assert.equal(state.actuators.A1.tier, 'B++++', 'A1 should escalate to B++++');
  assert.ok(state.actuators.A1.escalated_at, 'A1 escalated_at set');
  assert.equal(state.actuators.A7.anneal_auto_trigger, true, 'A7 anneal trigger active');
  const cleanGHS = computeGHS({ sensorValues: CLEAN_SENSORS }).score;
  assert.ok(cleanGHS >= 0.95, `clean GHS should be near 1; got ${cleanGHS}`);
  for (let i = 0; i < DEFAULT_CONSECUTIVE_CLEAN - 1; i += 1) {
    state = runEngine({ ghs: cleanGHS, sensors: CLEAN_SENSORS }, store);
    assert.ok(state.actuators.A1.escalated_at, `A1 still escalated at iter ${i + 1} (needs ${DEFAULT_CONSECUTIVE_CLEAN} clean)`);
  }
  state = runEngine({ ghs: cleanGHS, sensors: CLEAN_SENSORS }, store);
  assert.equal(state.actuators.A1.escalated_at, null, 'A1 de-escalated after N clean iters');
  assert.ok(state.actuators.A1.deescalation_eligible_at, 'A1 deescalation_eligible_at set');
  assert.equal(state.actuators.A7.escalated_at, null, 'A7 also de-escalated');
  fs.unlinkSync(store);
});

test('GHS feedback loop: partial recovery does NOT de-escalate', () => {
  const store = tempStore();
  const ghsLow = computeGHS({ sensorValues: HIGH_VIOLATION_SENSORS }).score;
  runEngine({ ghs: ghsLow }, store);
  const partialCleanSensors = { ga: 0.5, ll: 0.5, cf: 0.5, pr: 0.5, rp: 0.5, oo: 0 };
  const ghsPartial = computeGHS({ sensorValues: partialCleanSensors }).score;
  assert.ok(ghsPartial < 0.75 && ghsPartial > 0.35, `partial GHS in mid-range; got ${ghsPartial}`);
  for (let i = 0; i < DEFAULT_CONSECUTIVE_CLEAN + 2; i += 1) {
    const state = runEngine({ ghs: ghsPartial }, store);
    assert.ok(state.actuators.A6.escalated_at, 'A6 (threshold 0.75) stays escalated at mid-range GHS');
  }
  fs.unlinkSync(store);
});

test('GHS feedback loop: per-actuator independent de-escalation', () => {
  const store = tempStore();
  const sensorsLow = { ga: 0.95, ll: 0.95, cf: 0.95, pr: 0.95, rp: 0.95, oo: 0 };
  const ghsLow = computeGHS({ sensorValues: sensorsLow }).score;
  runEngine({ ghs: ghsLow }, store);
  const sensorsClean = { ga: 0.10, ll: 0.10, cf: 0.10, pr: 0.10, rp: 0.10, oo: 0 };
  const ghsClean = computeGHS({ sensorValues: sensorsClean }).score;
  assert.ok(ghsClean >= 0.85, `expected clean GHS >=0.85; got ${ghsClean}`);
  for (let i = 0; i < DEFAULT_CONSECUTIVE_CLEAN; i += 1) runEngine({ ghs: ghsClean }, store);
  const state = JSON.parse(fs.readFileSync(store, 'utf8'));
  assert.equal(state.actuators.A1.escalated_at, null, 'A1 (>0.80) de-escalated');
  assert.equal(state.actuators.A4.escalated_at, null, 'A4 (>0.55) de-escalated');
  assert.equal(state.actuators.A7.escalated_at, null, 'A7 (>0.45) de-escalated');
  fs.unlinkSync(store);
});
