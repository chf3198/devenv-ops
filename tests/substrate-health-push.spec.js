// substrate-health-push tests (#943).
const { test, expect } = require('@playwright/test');
const path = require('path');

const PUSH = require(path.resolve(__dirname, '..', 'scripts', 'global', 'substrate-health-push.js'));

test('canonicalize sorts keys deterministically', () => {
  const a = PUSH.canonicalize({ ts: 1000, providers: { groq: { available: true } }, tier: 'fleet' });
  const b = PUSH.canonicalize({ tier: 'fleet', providers: { groq: { available: true } }, ts: 1000 });
  expect(a).toBe(b);
});

test('loadEd25519Key reads OPERATOR_KEY_SEED_B64', () => {
  const seed = Buffer.alloc(32, 11).toString('base64');
  const orig = process.env.OPERATOR_KEY_SEED_B64;
  process.env.OPERATOR_KEY_SEED_B64 = seed;
  try {
    const key = PUSH.loadEd25519Key();
    expect(key.asymmetricKeyType).toBe('ed25519');
  } finally {
    if (orig === undefined) delete process.env.OPERATOR_KEY_SEED_B64;
    else process.env.OPERATOR_KEY_SEED_B64 = orig;
  }
});

test.describe('live /substrate-health route (post-#943 deploy)', () => {
  const BASE = 'https://hamr.chf3198.workers.dev';

  test('/substrate-health returns 401 missing_dpop without auth', async ({ request }) => {
    const r = await request.post(`${BASE}/substrate-health`, { data: { providers: {} } });
    expect(r.status()).toBe(401);
  });

  test('/substrate-health returns 401 missing_signature_headers with DPoP-only', async ({ request }) => {
    const r = await request.post(`${BASE}/substrate-health`, {
      data: { providers: {} }, headers: { authorization: 'DPoP test' },
    });
    expect(r.status()).toBe(401);
    const body = await r.json();
    expect(body.reason).toBe('missing_signature_headers');
  });

  test('/substrate-health returns 401 unknown_key_id with bogus key', async ({ request }) => {
    const r = await request.post(`${BASE}/substrate-health`, {
      data: { providers: {} },
      headers: {
        authorization: 'DPoP test',
        'x-hamr-signature': 'sig', 'x-hamr-key-id': 'bogus', 'x-hamr-canonical': 'c',
      },
    });
    expect(r.status()).toBe(401);
    const body = await r.json();
    expect(['unknown_key_id', 'no_publisher_keyring_configured']).toContain(body.reason);
  });
});
