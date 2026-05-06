// axis_consumers extension tests (#978).
const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawnSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const ACTIVATE = path.join(REPO_ROOT, 'scripts', 'global', 'hamr-activate.sh');

test('all 3 team markers contain axis_consumers field with all 4 axes', () => {
  for (const cfg of [
    path.join(os.homedir(), '.claude', 'hamr-config.json'),
    path.join(os.homedir(), '.copilot', 'hamr-config.json'),
    path.join(os.homedir(), '.codex', 'devenv-ops', 'hamr-config.json'),
  ]) {
    expect(fs.existsSync(cfg)).toBe(true);
    const parsed = JSON.parse(fs.readFileSync(cfg, 'utf8'));
    expect(parsed.axis_consumers).toBeDefined();
    expect(typeof parsed.axis_consumers.governance).toBe('boolean');
    expect(typeof parsed.axis_consumers.tooling).toBe('boolean');
    expect(typeof parsed.axis_consumers.fleet).toBe('boolean');
    expect(typeof parsed.axis_consumers.hamr).toBe('boolean');
  }
});

test('HAMR_AXES_OFF=fleet,tooling sets those false; others true', () => {
  const result = spawnSync('bash', [ACTIVATE], {
    cwd: REPO_ROOT, encoding: 'utf8',
    env: { ...process.env, HAMR_TEAM: 'claude-code', HAMR_AXES_OFF: 'fleet,tooling' },
  });
  expect(result.status).toBe(0);
  const cfg = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.claude', 'hamr-config.json'), 'utf8'));
  expect(cfg.axis_consumers.fleet).toBe(false);
  expect(cfg.axis_consumers.tooling).toBe(false);
  expect(cfg.axis_consumers.governance).toBe(true);
  expect(cfg.axis_consumers.hamr).toBe(true);
  // Restore for downstream tests.
  spawnSync('bash', [ACTIVATE], { cwd: REPO_ROOT, env: { ...process.env, HAMR_TEAM: 'claude-code' } });
});

test('hamr-provider-wrapper still recognizes enabled:true regardless of axis content', () => {
  const WRAP = require(path.resolve(REPO_ROOT, 'scripts', 'global', 'hamr-provider-wrapper.js'));
  const orig = process.env.MEGINGJORD_HAMR_DISABLED;
  delete process.env.MEGINGJORD_HAMR_DISABLED;
  try {
    expect(WRAP.isDisabled()).toBe(false);
  } finally {
    if (orig !== undefined) process.env.MEGINGJORD_HAMR_DISABLED = orig;
  }
});
