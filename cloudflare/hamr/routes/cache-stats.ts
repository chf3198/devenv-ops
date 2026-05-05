// HAMR /cache-stats — Worker-side KV writer for cache-stats:hit-rate-7d (#933).
// Closes the producer gap on /quota's hit_rate_7d signal.
// Operator pushes signed payload from `cache-stats-push.js`; we Ed25519-verify, then KV-write.
import type { Env } from '../worker';

const HIT_RATE_KEY = 'cache-stats:hit-rate-7d';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

function unauthorized(reason: string): Response {
  return new Response(JSON.stringify({ error: 'unauthorized', reason }), {
    status: 401, headers: { 'content-type': 'application/json' },
  });
}

function badRequest(reason: string): Response {
  return new Response(JSON.stringify({ error: 'bad_request', reason }), {
    status: 400, headers: { 'content-type': 'application/json' },
  });
}

function decodeKeyring(env: Env): Record<string, string> | null {
  if (!env.PUBLISHER_KEYRING) return null;
  try { return JSON.parse(env.PUBLISHER_KEYRING) as Record<string, string>; } catch { return null; }
}

async function verifyEd25519(spkiB64: string, canonical: string, sigB64: string): Promise<boolean> {
  try {
    const spki = Uint8Array.from(atob(spkiB64), (c) => c.charCodeAt(0));
    const data = new TextEncoder().encode(canonical);
    const sig = Uint8Array.from(atob(sigB64), (c) => c.charCodeAt(0));
    const key = await crypto.subtle.importKey('spki', spki, { name: 'Ed25519' }, false, ['verify']);
    return await crypto.subtle.verify('Ed25519', key, sig, data);
  } catch { return false; }
}

export async function cacheStats(request: Request, env: Env): Promise<Response> {
  const auth = request.headers.get('authorization') ?? '';
  if (!auth.startsWith('DPoP ')) return unauthorized('missing_dpop');
  const sigHeader = request.headers.get('x-hamr-signature') ?? '';
  const keyId = request.headers.get('x-hamr-key-id') ?? '';
  const canonical = request.headers.get('x-hamr-canonical') ?? '';
  if (!sigHeader || !keyId || !canonical) return unauthorized('missing_signature_headers');

  const keyring = decodeKeyring(env);
  if (!keyring) return unauthorized('no_publisher_keyring_configured');
  const spkiB64 = keyring[keyId];
  if (!spkiB64) return unauthorized('unknown_key_id');
  if (!await verifyEd25519(spkiB64, canonical, sigHeader)) return unauthorized('bad_signature');

  let payload: { hit_rate?: number; sample_count?: number; ts?: number };
  try { payload = await request.json(); } catch { return badRequest('invalid_json'); }
  if (typeof payload.hit_rate !== 'number' || payload.hit_rate < 0 || payload.hit_rate > 1) {
    return badRequest('hit_rate_out_of_range');
  }
  const age = Date.now() - (payload.ts ?? 0);
  if (payload.ts && age > MAX_AGE_MS) return badRequest('payload_too_old');

  const record = JSON.stringify({
    hit_rate: payload.hit_rate, sample_count: payload.sample_count ?? 0,
    ts: payload.ts ?? Date.now(), key_id: keyId,
  });
  await env.HAMR_KV.put(HIT_RATE_KEY, String(payload.hit_rate));
  await env.HAMR_KV.put(`${HIT_RATE_KEY}:meta`, record);
  return new Response(JSON.stringify({ ok: true, written: HIT_RATE_KEY, hit_rate: payload.hit_rate }), {
    status: 200, headers: { 'content-type': 'application/json' },
  });
}
