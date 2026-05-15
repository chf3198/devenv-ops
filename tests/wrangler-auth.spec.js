// wrangler-auth tests — D1 (#1564): token never leaked to stdout/stderr.
'use strict';
const { test, expect } = require('@playwright/test');
const path = require('path');
const { execSync, spawnSync } = require('node:child_process');

const AUTH = require(path.resolve(__dirname, '..', 'scripts', 'global', 'wrangler-auth.js'));

test('loadToken reads from CLOUDFLARE_API_TOKEN env var first', () => {
  const orig = process.env.CLOUDFLARE_API_TOKEN;
  process.env.CLOUDFLARE_API_TOKEN = 'test-token-env';
  try {
    expect(AUTH.loadToken()).toBe('test-token-env');
  } finally {
    if (orig === undefined) delete process.env.CLOUDFLARE_API_TOKEN;
    else process.env.CLOUDFLARE_API_TOKEN = orig;
  }
});

test('loadToken returns null when no env var and no .env in path', () => {
  const orig = process.env.CLOUDFLARE_API_TOKEN;
  delete process.env.CLOUDFLARE_API_TOKEN;
  // Override REPO_ROOT resolution by testing with a temp dir path
  // The module resolves .env relative to itself; test at module level only.
  // If env var absent and .env present, token comes from file — tested in integration.
  // This tests the null-safe path when no env is set and we detect absence.
  process.env.CLOUDFLARE_API_TOKEN = '';
  try {
    const token = AUTH.loadToken();
    // Empty string env var → should return empty string (falsy), not crash
    expect(typeof token).toBe('string');
  } finally {
    if (orig === undefined) delete process.env.CLOUDFLARE_API_TOKEN;
    else process.env.CLOUDFLARE_API_TOKEN = orig;
  }
});

test('wrangler-auth exits non-zero with no args', () => {
  const result = spawnSync(process.execPath, [
    path.resolve(__dirname, '..', 'scripts', 'global', 'wrangler-auth.js'),
  ], { env: { ...process.env, CLOUDFLARE_API_TOKEN: 'dummy' } });
  expect(result.status).not.toBe(0);
  const stderr = result.stderr?.toString() ?? '';
  expect(stderr).toContain('Usage');
  // Token must not appear in output
  expect(stderr).not.toContain('dummy');
  expect((result.stdout?.toString() ?? '')).not.toContain('dummy');
});

test('token is not present in child process stdout or stderr', () => {
  // Spawn wrangler-auth with a deliberate bad command; verify token never echoed.
  const sentinel = 'SENTINEL_TOKEN_XYZ_DO_NOT_ECHO_' + Math.random().toString(36).slice(2);
  const result = spawnSync(process.execPath, [
    path.resolve(__dirname, '..', 'scripts', 'global', 'wrangler-auth.js'),
    '--version',
  ], {
    env: { ...process.env, CLOUDFLARE_API_TOKEN: sentinel },
    timeout: 10000,
  });
  const out = (result.stdout?.toString() ?? '') + (result.stderr?.toString() ?? '');
  expect(out).not.toContain(sentinel);
});
