// HAMR /healthz — tier-aware status. R9.3: returns within 5 s under all conditions.
import type { Env } from '../worker';

export async function healthz(env: Env): Promise<Response> {
  const ts = Date.now();
  // Race each substrate probe against a 1-s timeout; fail-soft.
  const probe = async <T>(label: string, fn: () => Promise<T>): Promise<{ ok: boolean; reason?: string }> => {
    try {
      await Promise.race([
        fn(),
        new Promise((_, rj) => setTimeout(() => rj(new Error(label + '_timeout')), 1000)),
      ]);
      return { ok: true };
    } catch (e) {
      return { ok: false, reason: e instanceof Error ? e.message : 'unknown' };
    }
  };

  const kv = await probe('kv', async () => env.HAMR_KV.get('__healthz__'));
  const r2 = await probe('r2', async () => env.HAMR_BUNDLES.head('__healthz__'));

  const tier = kv.ok && r2.ok ? 'tier1-full' : (kv.ok || r2.ok ? 'tier2-degraded' : 'tier3-offline');
  const reason = tier === 'tier1-full'
    ? 'all-bindings-reachable'
    : tier === 'tier2-degraded'
      ? `kv=${kv.ok ? 'ok' : kv.reason} r2=${r2.ok ? 'ok' : r2.reason}`
      : 'all-bindings-unreachable';

  return new Response(JSON.stringify({
    schema_version: 1,
    ok: true,
    tier,
    reason,
    ts,
    bindings: { kv, r2 },
    environment: env.ENVIRONMENT ?? 'production',
  }), {
    status: 200,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}
