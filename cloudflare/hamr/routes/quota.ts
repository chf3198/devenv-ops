// HAMR /quota — Wave 2 placeholder; full token-quota report ships in Wave 4 child 9.
// Returns empty body but valid 200 so callers can shape against the schema.
import type { Env } from '../worker';

interface QuotaReport {
  schema_version: number;
  ts: number;
  hit_rate_7d: number | null;
  providers: Record<string, { rate_limited: boolean; reset_at: number | null }>;
  placeholder: true;
}

export async function quota(_env: Env): Promise<Response> {
  const body: QuotaReport = {
    schema_version: 1,
    ts: Date.now(),
    hit_rate_7d: null, // Wave 4 child 3 wires the real cache-hit-rate counter
    providers: {}, // Wave 4 child 9 fills with header-driven spillover state
    placeholder: true,
  };
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}
