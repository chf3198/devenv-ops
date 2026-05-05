// HAMR core Worker live-route tests (#910).
// Hits the deployed Worker at hamr.chf3198.workers.dev. Read-only.
const { test, expect } = require('@playwright/test');

const BASE = process.env.HAMR_WORKER_URL || 'https://hamr.chf3198.workers.dev';

test('/healthz returns 200 with tier classification', async ({ request }) => {
  const r = await request.get(`${BASE}/healthz`);
  expect(r.status()).toBe(200);
  const body = await r.json();
  expect(body.schema_version).toBe(1);
  expect(body.ok).toBe(true);
  expect(['tier1-full', 'tier2-degraded', 'tier3-offline']).toContain(body.tier);
  expect(typeof body.ts).toBe('number');
  expect(body.bindings).toHaveProperty('kv');
  expect(body.bindings).toHaveProperty('r2');
});

test('/healthz security headers present', async ({ request }) => {
  const r = await request.get(`${BASE}/healthz`);
  expect(r.headers()['strict-transport-security']).toContain('max-age');
  expect(r.headers()['x-content-type-options']).toBe('nosniff');
  expect(r.headers()['referrer-policy']).toBe('no-referrer');
  expect(r.headers()['x-hamr-elapsed-ms']).toBeDefined();
});

test('/bundle/<profile>/<sha> returns 404 for missing bundle', async ({ request }) => {
  const r = await request.get(`${BASE}/bundle/governance-30kb/abc123def456`);
  expect(r.status()).toBe(404);
  const body = await r.json();
  expect(body.error).toBe('not_found');
});

test('/bundle rejects unknown profile with 400', async ({ request }) => {
  const r = await request.get(`${BASE}/bundle/unknown-profile/abc123`);
  expect(r.status()).toBe(400);
  const body = await r.json();
  expect(body.error).toBe('bad_request');
  expect(body.reason).toBe('unknown_profile');
});

test('/bundle rejects invalid sha with 400', async ({ request }) => {
  const r = await request.get(`${BASE}/bundle/governance-30kb/not-a-sha`);
  expect(r.status()).toBe(400);
  const body = await r.json();
  expect(body.reason).toBe('invalid_sha');
});

test('/mcp returns 401 missing_dpop without authorization header', async ({ request }) => {
  const r = await request.post(`${BASE}/mcp`, { data: {} });
  expect(r.status()).toBe(401);
  const body = await r.json();
  expect(body.error).toBe('unauthorized');
  expect(body.reason).toBe('missing_dpop');
});

// /mailbox/read promoted to production by Wave 3 #918 — recipient param required.
test('/mailbox/read rejects bare GET with 400 missing_recipient', async ({ request }) => {
  const r = await request.get(`${BASE}/mailbox/read`);
  expect(r.status()).toBe(400);
  const body = await r.json();
  expect(body.error).toBe('missing_recipient');
});

// /mailbox/write promoted to production by Wave 3 #918 — auth required.
test('/mailbox/write rejects unauthenticated request with 401', async ({ request }) => {
  const r = await request.post(`${BASE}/mailbox/write`, { data: {} });
  expect(r.status()).toBe(401);
});

// /quota promoted to schema v2 by Wave 4 #927 + stale field by Wave 6 #941.
test('/quota returns 200 schema_version 2 with placeholder:false', async ({ request }) => {
  const r = await request.get(`${BASE}/quota`);
  expect(r.status()).toBe(200);
  const body = await r.json();
  expect(body.schema_version).toBe(2);
  expect(body.placeholder).toBe(false);
  expect(body).toHaveProperty('hit_rate_7d');
  expect(typeof body.stale).toBe('boolean');
});

test('unknown route returns 404 JSON', async ({ request }) => {
  const r = await request.get(`${BASE}/this-does-not-exist`);
  expect(r.status()).toBe(404);
  const body = await r.json();
  expect(body.error).toBe('not_found');
});
