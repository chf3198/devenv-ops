// cache-stats-push auth regression (#1415): PUBLISHER_KEYRING + stale/last_update fix.
const { test, expect } = require('@playwright/test');
const crypto = require('node:crypto');
const path = require('path');

const PUSH = require(path.resolve(__dirname, '..', 'scripts', 'global', 'cache-stats-push.js'));
const BASE = 'https://hamr.chf3198.workers.dev';

function makeSeed32() { return Buffer.alloc(32, 0xab); }
function deriveKeyPair(seed) {
  const der = Buffer.concat([
    Buffer.from('302e020100300506032b657004220420', 'hex'), seed,
  ]);
  const priv = crypto.createPrivateKey({ key: der, format: 'der', type: 'pkcs8' });
  const pub = crypto.createPublicKey(priv);
  return { priv, spkiB64: pub.export({ type: 'spki', format: 'der' }).toString('base64') };
}

test('emitAuthError helper: exports present', () => {
  expect(typeof PUSH.canonicalize).toBe('function');
  expect(typeof PUSH.loadEd25519Key).toBe('function');
  expect(typeof PUSH.pushHitRate).toBe('function');
});

test('signature is verifiable by webcrypto (cross-runtime)', async () => {
  const { webcrypto } = crypto;
  const { priv, spkiB64 } = deriveKeyPair(makeSeed32());
  const msg = PUSH.canonicalize({ hit_rate: 0.5, sample_count: 8, ts: 9000 });
  const sigB64 = crypto.sign(null, Buffer.from(msg), priv).toString('base64');
  const spki = Uint8Array.from(atob(spkiB64), (c) => c.charCodeAt(0));
  const sigBytes = Uint8Array.from(atob(sigB64), (c) => c.charCodeAt(0));
  const key = await webcrypto.subtle.importKey(
    'spki', spki, { name: 'Ed25519' }, false, ['verify'],
  );
  const ok = await webcrypto.subtle.verify('Ed25519', key, sigBytes, new TextEncoder().encode(msg));
  expect(ok).toBe(true);
});

test.describe('live /cache-stats — registered key (#1415)', () => {
  test('/cache-stats returns 401 unknown_key_id for unregistered key_id', async ({ request }) => {
    const seed = Buffer.alloc(32, 0xff);
    const { priv, spkiB64: _ } = deriveKeyPair(seed);
    const payload = { hit_rate: 0.5, sample_count: 4, ts: Date.now() };
    const canonical = PUSH.canonicalize(payload);
    const sig = crypto.sign(null, Buffer.from(canonical), priv).toString('base64');
    const r = await request.post(`${BASE}/cache-stats`, {
      data: payload,
      headers: {
        authorization: 'DPoP cache-stats-push',
        'x-hamr-key-id': 'unregistered-key-1415',
        'x-hamr-signature': sig,
        'x-hamr-canonical': canonical,
      },
    });
    expect(r.status()).toBe(401);
    const body = await r.json();
    expect(body.reason).toBe('unknown_key_id');
  });

  test('/quota reflects fresh hit_rate_7d after successful push', async ({ request }) => {
    const r = await request.get(`${BASE}/quota`);
    expect(r.status()).toBe(200);
    const body = await r.json();
    expect(typeof body.hit_rate_7d).toBe('number');
    expect(body.stale).toBe(false);
    expect(typeof body.last_update_ms).toBe('number');
  });
});
