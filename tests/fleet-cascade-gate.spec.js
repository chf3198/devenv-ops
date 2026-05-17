'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { evaluateCascade, summarizeCascade, classifyLane }
  = require('../scripts/global/fleet-cascade-gate.js');

test('classifyLane maps free/fleet to fleetFree', () => {
  assert.equal(classifyLane({ lane: 'free' }), 'fleetFree');
  assert.equal(classifyLane({ lane: 'fleet' }), 'fleetFree');
  assert.equal(classifyLane({ tier: 'fleet' }), 'fleetFree');
});

test('classifyLane maps paid tiers', () => {
  assert.equal(classifyLane({ lane: 'haiku' }), 'haiku');
  assert.equal(classifyLane({ lane: 'premium' }), 'premium');
});

test('summarizeCascade computes shares', () => {
  const records = [
    { lane: 'fleet' }, { lane: 'fleet' }, { lane: 'fleet' }, { lane: 'fleet' },
    { lane: 'haiku' }, { lane: 'premium' },
  ];
  const s = summarizeCascade(records);
  assert.equal(s.samples, 6);
  assert.equal(s.fleetFreeShare, 0.6667);
  assert.equal(s.haikuShare, 0.1667);
  assert.equal(s.premiumShare, 0.1667);
});

test('evaluateCascade passes when fleet ≥ 85% and haiku ≤ 3%', () => {
  const records = [];
  for (let i = 0; i < 87; i++) records.push({ lane: 'fleet' });
  for (let i = 0; i < 2; i++) records.push({ lane: 'haiku' });
  for (let i = 0; i < 11; i++) records.push({ lane: 'premium' });
  const r = evaluateCascade(records);
  assert.equal(r.passed, true);
  assert.equal(r.escalationReason, null);
});

test('evaluateCascade fails when fleet < 85%', () => {
  const records = [];
  for (let i = 0; i < 80; i++) records.push({ lane: 'fleet' });
  for (let i = 0; i < 20; i++) records.push({ lane: 'premium' });
  const r = evaluateCascade(records);
  assert.equal(r.passed, false);
  assert.equal(r.escalationReason, 'fleet-bypass');
  assert.ok(r.violations.some(v => v.includes('fleet_share')));
});

test('evaluateCascade fails when haiku exceeds 3% ceiling', () => {
  const records = [];
  for (let i = 0; i < 90; i++) records.push({ lane: 'fleet' });
  for (let i = 0; i < 10; i++) records.push({ lane: 'haiku' });
  const r = evaluateCascade(records);
  assert.equal(r.passed, false);
  assert.ok(r.violations.some(v => v.includes('haiku_share')));
});

test('evaluateCascade insufficient samples passes (no false alarm)', () => {
  const r = evaluateCascade([{ lane: 'premium' }, { lane: 'haiku' }]);
  assert.equal(r.passed, true);
  assert.equal(r.reason, 'insufficient_samples');
});

test('evaluateCascade respects opts.minFleetUtilizationShare override', () => {
  const records = [];
  for (let i = 0; i < 90; i++) records.push({ lane: 'fleet' });
  for (let i = 0; i < 10; i++) records.push({ lane: 'premium' });
  const r = evaluateCascade(records, { minFleetUtilizationShare: 0.95 });
  assert.equal(r.passed, false);
});
