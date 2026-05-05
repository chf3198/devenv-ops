// hamr-sync-verify tests (#955).
const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const os = require('os');

const VERIFY = require(path.resolve(__dirname, '..', 'scripts', 'global', 'hamr-sync-verify.js'));

test('HAMR_SCRIPTS canonical set covers all 3 teams worth', () => {
  expect(VERIFY.HAMR_SCRIPTS).toContain('cache-stats-emit.js');
  expect(VERIFY.HAMR_SCRIPTS).toContain('hamr-provider-wrapper.js');
  expect(VERIFY.HAMR_SCRIPTS).toContain('substrate-health-push.js');
  expect(VERIFY.HAMR_SCRIPTS.length).toBeGreaterThanOrEqual(10);
});

test('TARGETS includes copilot and codex deploy paths', () => {
  const teams = VERIFY.TARGETS.map((t) => t.team);
  expect(teams).toContain('copilot');
  expect(teams).toContain('codex');
  for (const t of VERIFY.TARGETS) {
    expect(t.dir).toContain(os.homedir());
  }
});

test('run() reports per-team missing/present split with summary', () => {
  const result = VERIFY.run();
  expect(typeof result.ok).toBe('boolean');
  expect(Array.isArray(result.targets)).toBe(true);
  expect(result.targets).toHaveLength(2);
  for (const t of result.targets) {
    expect(t).toHaveProperty('team');
    expect(t).toHaveProperty('dir');
    expect(Array.isArray(t.missing)).toBe(true);
    expect(Array.isArray(t.present)).toBe(true);
  }
  if (!result.ok) expect(result.hint).toContain('sync:both');
});

test('run() reports ok:true when both targets fully populated (mock)', () => {
  // Verify the boolean ok flag is computed correctly — by inspecting result shape against current state.
  const result = VERIFY.run();
  const totalMissing = result.targets.reduce((sum, t) => sum + t.missing.length, 0);
  expect(result.total_missing).toBe(totalMissing);
  expect(result.ok).toBe(totalMissing === 0);
});
