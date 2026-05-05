// HAMR /bundle/<profile>/<sha> — content-addressed bundle fetch from R2.
// R4: KV edge-cache via Cache-Control + stale-while-revalidate.
import type { Env } from '../worker';

const PROFILES = new Set(['fim-5kb', 'routing-12kb', 'governance-30kb', 'architect-90kb']);
const SHA_RE = /^[0-9a-f]{6,64}$/;

function badRequest(reason: string): Response {
  return new Response(JSON.stringify({ error: 'bad_request', reason }), {
    status: 400, headers: { 'content-type': 'application/json' },
  });
}

export async function bundle(url: URL, env: Env): Promise<Response> {
  // /bundle/<profile>/<sha>
  const parts = url.pathname.split('/').filter(Boolean);
  if (parts.length !== 3) return badRequest('expected /bundle/<profile>/<sha>');
  const [, profile, sha] = parts;
  if (!PROFILES.has(profile)) return badRequest('unknown_profile');
  if (!SHA_RE.test(sha)) return badRequest('invalid_sha');

  const r2Key = `bundles/${profile}/${sha}.tar.zst`;
  const obj = await env.HAMR_BUNDLES.get(r2Key);
  if (!obj) {
    return new Response(JSON.stringify({ error: 'not_found', key: r2Key }), {
      status: 404,
      headers: {
        'content-type': 'application/json',
        'cache-control': 'public, max-age=60', // negative cache short
      },
    });
  }
  return new Response(obj.body, {
    status: 200,
    headers: {
      'content-type': 'application/octet-stream',
      'content-length': String(obj.size),
      'etag': `"${sha}"`,
      'cache-control': 'public, max-age=300, stale-while-revalidate=60', // R4 mandate
      'x-hamr-profile': profile,
      'x-hamr-sha': sha,
      'x-cache-source': 'r2',
    },
  });
}
