// HAMR /mcp — MCP gateway with DPoP-style proof verification.
// R1: verifies Ed25519 signature over canonical body via PUBLISHER_KEYRING.
// DC-2: SLSA gate placeholder — Wave 2 child 6 (#912) wires real slsa-verifier.
import type { Env } from '../worker';

function unauthorized(reason: string): Response {
  return new Response(JSON.stringify({ error: 'unauthorized', reason }), {
    status: 401, headers: { 'content-type': 'application/json' },
  });
}

function decodeKeyring(env: Env): Record<string, string> | null {
  if (!env.PUBLISHER_KEYRING) return null;
  try { return JSON.parse(env.PUBLISHER_KEYRING) as Record<string, string>; } catch { return null; }
}

async function verifyEd25519(spkiB64: string, dataB64: string, sigB64: string): Promise<boolean> {
  try {
    const spki = Uint8Array.from(atob(spkiB64), (c) => c.charCodeAt(0));
    const data = Uint8Array.from(atob(dataB64), (c) => c.charCodeAt(0));
    const sig = Uint8Array.from(atob(sigB64), (c) => c.charCodeAt(0));
    const key = await crypto.subtle.importKey('spki', spki, { name: 'Ed25519' }, false, ['verify']);
    return await crypto.subtle.verify('Ed25519', key, sig, data);
  } catch { return false; }
}

export async function mcp(request: Request, env: Env): Promise<Response> {
  const auth = request.headers.get('authorization') ?? '';
  if (!auth.startsWith('DPoP ')) return unauthorized('missing_dpop');
  const sigHeader = request.headers.get('x-hamr-signature') ?? '';
  const keyId = request.headers.get('x-hamr-key-id') ?? '';
  const dataB64 = request.headers.get('x-hamr-canonical') ?? '';
  if (!sigHeader || !keyId || !dataB64) return unauthorized('missing_signature_headers');

  const keyring = decodeKeyring(env);
  if (!keyring) return unauthorized('no_publisher_keyring_configured');
  const spkiB64 = keyring[keyId];
  if (!spkiB64) return unauthorized('unknown_key_id');

  const valid = await verifyEd25519(spkiB64, dataB64, sigHeader);
  if (!valid) return unauthorized('bad_signature');

  // SLSA gate placeholder — Wave 2 child 6 (#912) wires the real slsa-verifier.
  return new Response(JSON.stringify({
    error: 'slsa_gate_pending',
    detail: 'SLSA verifier wired by Wave 2 child 6 (#912); placeholder returning 503.',
    key_id: keyId,
  }), { status: 503, headers: { 'content-type': 'application/json' } });
}
