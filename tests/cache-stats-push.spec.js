// cache-stats-push tests (#933).
const { test, expect } = require('@playwright/test');
const path = require('path');

const PUSH = require(path.resolve(__dirname, '..', 'scripts', 'global', 'cache-stats-push.js'));

test('canonicalize sorts keys deterministically', () => {
  const a = PUSH.canonicalize({ hit_rate: 0.85, sample_count: 10, ts: 1000 });
  const b = PUSH.canonicalize({ ts: 1000, hit_rate: 0.85, sample_count: 10 });
  expect(a).toBe(b);
  expect(a).toBe('{"hit_rate":0.85,"sample_count":10,"ts":1000}');
});

test('loadEd25519Key reads OPERATOR_KEY_SEED_B64 when set', () => {
  const seed = Buffer.alloc(32, 7).toString('base64');
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

test('loadEd25519Key throws on bad seed length', () => {
  const orig = process.env.OPERATOR_KEY_SEED_B64;
  process.env.OPERATOR_KEY_SEED_B64 = Buffer.alloc(16).toString('base64');
  try {
    expect(() => PUSH.loadEd25519Key()).toThrow(/32 bytes/);
  } finally {
    if (orig === undefined) delete process.env.OPERATOR_KEY_SEED_B64;
    else process.env.OPERATOR_KEY_SEED_B64 = orig;
  }
});

test.describe('live /cache-stats route (post-#933 deploy)', () => {
  const BASE = 'https://hamr.chf3198.workers.dev';

  test('/cache-stats returns 401 missing_dpop without auth', async ({ request }) => {
    const r = await request.post(`${BASE}/cache-stats`, { data: {} });
    expect(r.status()).toBe(401);
  });

  test('/cache-stats returns 401 missing_signature_headers when only DPoP present', async ({ request }) => {
    const r = await request.post(`${BASE}/cache-stats`, {
      data: { hit_rate: 0.9, ts: Date.now() },
      headers: { authorization: 'DPoP test' },
    });
    expect(r.status()).toBe(401);
    const body = await r.json();
    expect(body.reason).toBe('missing_signature_headers');
  });
});
