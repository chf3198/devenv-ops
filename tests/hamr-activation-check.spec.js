const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawnSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const HOOK = path.join(REPO_ROOT, 'hooks', 'scripts', 'hamr_activation_check.py');

function runHook(configPath) {
  return spawnSync('python3', [HOOK], {
    cwd: REPO_ROOT,
    input: '{}',
    encoding: 'utf8',
    env: { ...process.env, HAMR_CONFIG_PATH: configPath },
  });
}

function contextText(result) {
  return JSON.parse(result.stdout).hookSpecificOutput.additionalContext;
}

test('HAMR activation hook warns when config is absent', () => {
  const missing = path.join(os.tmpdir(), `hamr-missing-${Date.now()}.json`);
  const result = runHook(missing);
  expect(result.status).toBe(0);
  expect(contextText(result)).toContain('HAMR activation warning');
});

test('HAMR activation hook reports fresh activation', () => {
  const file = path.join(os.tmpdir(), `hamr-fresh-${Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify({
    enabled: true,
    activated_at: new Date().toISOString(),
  }));
  const result = runHook(file);
  expect(result.status).toBe(0);
  expect(contextText(result)).toContain('HAMR activation fresh');
});
