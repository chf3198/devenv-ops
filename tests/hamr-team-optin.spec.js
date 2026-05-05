// Per-team HAMR opt-in tests (#963).
const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const os = require('os');

const WRAP = require(path.resolve(__dirname, '..', 'scripts', 'global', 'hamr-provider-wrapper.js'));

test('TEAM_CONFIG_PATHS covers all 3 team runtime homes', () => {
  const expected = [
    path.join(os.homedir(), '.claude', 'hamr-config.json'),
    path.join(os.homedir(), '.copilot', 'hamr-config.json'),
    path.join(os.homedir(), '.codex', 'devenv-ops', 'hamr-config.json'),
  ];
  expect(WRAP.TEAM_CONFIG_PATHS).toEqual(expected);
});

test('readTeamConfig returns first present config marker', () => {
  const cfg = WRAP.readTeamConfig();
  expect(cfg).not.toBeNull();
  expect(cfg.enabled).toBe(true);
  expect(['claude-code', 'copilot', 'codex']).toContain(cfg.activated_by);
});

test('isDisabled returns false when team config marker enabled', () => {
  const orig = process.env.MEGINGJORD_HAMR_DISABLED;
  delete process.env.MEGINGJORD_HAMR_DISABLED;
  try {
    expect(WRAP.isDisabled()).toBe(false);
  } finally {
    if (orig !== undefined) process.env.MEGINGJORD_HAMR_DISABLED = orig;
  }
});

test('all 3 team config markers exist on disk', () => {
  for (const file of WRAP.TEAM_CONFIG_PATHS) {
    expect(fs.existsSync(file)).toBe(true);
    const cfg = JSON.parse(fs.readFileSync(file, 'utf8'));
    expect(cfg.enabled).toBe(true);
    expect(typeof cfg.activated_at).toBe('string');
    expect(['claude-code', 'copilot', 'codex']).toContain(cfg.activated_by);
  }
});

test('isDisabled honors MEGINGJORD_HAMR_DISABLED=1 over team config', () => {
  const orig = process.env.MEGINGJORD_HAMR_DISABLED;
  process.env.MEGINGJORD_HAMR_DISABLED = '1';
  try {
    expect(WRAP.isDisabled()).toBe(true);
  } finally {
    if (orig === undefined) delete process.env.MEGINGJORD_HAMR_DISABLED;
    else process.env.MEGINGJORD_HAMR_DISABLED = orig;
  }
});
