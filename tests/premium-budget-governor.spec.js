'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { decideDowngrade, resolveBudget, normalizePremiumRationale, getDefaults }
  = require('../scripts/global/premium-budget-governor.js');

test('decideDowngrade below soft limit returns no downgrade', () => {
  const r = decideDowngrade(0.05, 0.11, 0.12);
  assert.equal(r.downgraded, false);
  assert.equal(r.reason, null);
});

test('decideDowngrade above soft limit returns soft-limit downgrade', () => {
  const r = decideDowngrade(0.115, 0.11, 0.12);
  assert.equal(r.downgraded, true);
  assert.equal(r.reason, 'premium_budget_soft_limit');
});

test('decideDowngrade above hard limit returns hard-limit downgrade', () => {
  const r = decideDowngrade(0.13, 0.11, 0.12);
  assert.equal(r.downgraded, true);
  assert.equal(r.reason, 'premium_budget_hard_limit');
});

test('resolveBudget disabled bypasses computation', () => {
  const r = resolveBudget({}, { disablePremiumBudget: true }, 'premium');
  assert.equal(r.enabled, false);
  assert.equal(r.downgraded, false);
});

test('resolveBudget non-premium lane skips budget gate', () => {
  const r = resolveBudget({}, {}, 'haiku');
  assert.equal(r.downgraded, false);
});

test('resolveBudget honors provided premiumShare30d (avoid telemetry read)', () => {
  const r = resolveBudget({}, { premiumShare30d: 0.115 }, 'premium');
  assert.equal(r.downgraded, true);
  assert.equal(r.downgradeReason, 'premium_budget_soft_limit');
  assert.equal(r.premiumShare30d, 0.115);
});

test('normalizePremiumRationale generates structured fallback', () => {
  const r = normalizePremiumRationale({}, 'security audit', 'critical', 0.95);
  assert.match(r.reason, /task_class=critical/);
  assert.match(r.reason, /complexity=0\.95/);
  assert.ok(r.evidence.length > 0);
});

test('normalizePremiumRationale preserves caller-provided rationale', () => {
  const r = normalizePremiumRationale(
    { premiumRationale: { reason: 'explicit', evidence: 'detail' } }, 'prompt', 'x', 0.5);
  assert.equal(r.reason, 'explicit');
  assert.equal(r.evidence, 'detail');
});

test('getDefaults reads policy.premiumBudget when present', () => {
  const r = getDefaults({ premiumBudget: { softLimitShare: 0.08, hardLimitShare: 0.10, windowDays: 14 } });
  assert.equal(r.softLimit, 0.08);
  assert.equal(r.hardLimit, 0.10);
  assert.equal(r.windowDays, 14);
});

test('getDefaults falls back to constants when policy missing', () => {
  const r = getDefaults({});
  assert.equal(r.softLimit, 0.11);
  assert.equal(r.hardLimit, 0.12);
  assert.equal(r.windowDays, 30);
});
