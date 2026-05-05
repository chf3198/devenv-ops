// HAMR /substrate-health — Worker KV writer for substrate-health:latest (#943).
// Mirrors /cache-stats pattern from #933. Closes the producer gap on /mcp doctor:probe.
import type { Env } from '../worker';

const HEALTH_KEY = 'substrate-health:latest';
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

export async function substrateHealth(request: Request, env: Env): Promise<Response> {
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

  let payload: { ts?: number; providers?: Record<string, unknown>; tier?: unknown };
  try { payload = await request.json(); } catch { return badRequest('invalid_json'); }
  if (!payload.providers || typeof payload.providers !== 'object') return badRequest('providers_required');
  const age = Date.now() - (payload.ts ?? 0);
  if (payload.ts && age > MAX_AGE_MS) return badRequest('payload_too_old');

  const record = JSON.stringify({ ...payload, ts: payload.ts ?? Date.now(), key_id: keyId });
  await env.HAMR_KV.put(HEALTH_KEY, record);
  return new Response(JSON.stringify({ ok: true, written: HEALTH_KEY }), {
    status: 200, headers: { 'content-type': 'application/json' },
  });
}
