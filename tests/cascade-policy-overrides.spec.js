// cascade-policy-overrides tests (#976).
const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const os = require('os');

const PROD = require(path.resolve(__dirname, '..', 'scripts', 'global', 'cascade-policy-overrides.js'));

test('buildOverrides shape includes hit_rate_7d, providers, schema_version', () => {
  const r = PROD.buildOverrides({ hit_rate_7d: 0.85, providers: { groq: { available: true } }, stale: false });
  expect(r).toMatchObject({ hit_rate_7d: 0.85, schema_version: 1, source: 'hamr/quota', stale: false });
  expect(r.providers).toEqual({ groq: { available: true } });
  expect(typeof r.ts).toBe('number');
});

test('buildOverrides handles missing fields gracefully', () => {
  const r = PROD.buildOverrides({});
  expect(r.hit_rate_7d).toBeNull();
  expect(r.providers).toEqual({});
  expect(r.stale).toBe(false);
});

test('writeOverrides round-trips JSON to disk', () => {
  const tmp = path.join(os.tmpdir(), `cpo-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
  const record = PROD.buildOverrides({ hit_rate_7d: 0.5, providers: {} });
  const result = PROD.writeOverrides(record, { file: tmp });
  expect(result.ok).toBe(true);
  const read = JSON.parse(fs.readFileSync(tmp, 'utf8'));
  expect(read.hit_rate_7d).toBe(0.5);
  expect(read.schema_version).toBe(1);
  fs.unlinkSync(tmp);
});

test('run() against unreachable URL returns ok:false with graceful_skip hint', async () => {
  const result = await PROD.run({ url: 'http://127.0.0.1:1' });
  expect(result.ok).toBe(false);
  expect(result.hint).toContain('graceful_skip');
});

test('OVERRIDES_FILE path is under operator home', () => {
  expect(PROD.OVERRIDES_FILE).toContain(os.homedir());
  expect(PROD.OVERRIDES_FILE).toContain('cascade-policy-overrides.json');
});

test('run() against live HAMR Worker writes overrides file', async () => {
  const tmp = path.join(os.tmpdir(), `cpo-live-${Date.now()}.json`);
  const result = await PROD.run({ file: tmp });
  if (!result.ok) {
    test.skip(true, 'Live Worker unreachable — graceful skip path verified by another test');
    return;
  }
  expect(fs.existsSync(tmp)).toBe(true);
  const read = JSON.parse(fs.readFileSync(tmp, 'utf8'));
  expect(read.schema_version).toBe(1);
  fs.unlinkSync(tmp);
});
