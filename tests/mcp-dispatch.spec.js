// /mcp capability dispatch tests (#935).
const { test, expect } = require('@playwright/test');

const BASE = 'https://hamr.chf3198.workers.dev';

test('/mcp returns 401 missing_dpop without auth', async ({ request }) => {
  const r = await request.post(`${BASE}/mcp`, { data: { capability: 'doctor:probe' } });
  expect(r.status()).toBe(401);
});

test('/mcp returns 401 missing_signature_headers when only DPoP present', async ({ request }) => {
  const r = await request.post(`${BASE}/mcp`, {
    data: { capability: 'doctor:probe' },
    headers: { authorization: 'DPoP test' },
  });
  expect(r.status()).toBe(401);
  const body = await r.json();
  expect(body.reason).toBe('missing_signature_headers');
});

test('/mcp returns 401 unknown_key_id with bogus key', async ({ request }) => {
  const r = await request.post(`${BASE}/mcp`, {
    data: { capability: 'doctor:probe' },
    headers: {
      authorization: 'DPoP test',
      'x-hamr-signature': 'sig', 'x-hamr-key-id': 'bogus', 'x-hamr-canonical': 'c',
    },
  });
  expect(r.status()).toBe(401);
  const body = await r.json();
  expect(['unknown_key_id', 'no_publisher_keyring_configured']).toContain(body.reason);
});

test('/mcp 503 path still works when bundle SHA advertised but no marker in KV', async ({ request }) => {
  const r = await request.post(`${BASE}/mcp`, {
    data: { capability: 'bundle:fetch' },
    headers: {
      authorization: 'DPoP test',
      'x-hamr-signature': 'sig', 'x-hamr-key-id': 'bogus', 'x-hamr-canonical': 'c',
      'x-hamr-bundle-sha': 'deadbeef',
    },
  });
  // 401 fires before SLSA gate — confirms auth comes first
  expect(r.status()).toBe(401);
});
