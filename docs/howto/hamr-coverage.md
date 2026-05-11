# HAMR Coverage Walkthrough

**Purpose**: Operator guide for verifying that all three harness teams
route governed provider calls through HAMR and that coverage metrics stay
above the thresholds required by Epic #1130 (AC4 ≥ 95%, AC5 < 5% stale).

## Prerequisites

- HAMR activated on this checkout: `npm run hamr:activate`
- Cron installed: `npm run hamr:install-cron`
- Activation confirmed: `npm run hamr:sync-verify`

## Step 1 — Check activation status

```bash
npm run hamr:sync-verify
```

Expected: all three runtime paths (`~/.copilot/`, `~/.codex/devenv-ops/`,
`~/.agents/skills/`) report scripts present. If any path is missing, re-run
`npm run deploy:both:apply` then `npm run hamr:activate`.

## Step 2 — Push fresh metrics to the Worker KV

```bash
npm run hamr:cache-push    # hit-rate-7d → /quota
npm run hamr:health-push   # substrate-health → /mcp doctor:probe
```

If offline, skip and note that `/quota.stale` will be `true` until next push.

## Step 3 — Read coverage from the Worker

```bash
curl -s https://hamr.chf3198.workers.dev/quota | jq .
```

Key fields:
| Field | Threshold | Meaning |
|---|---|---|
| `hit_rate_7d` | ≥ 0.95 | AC4 gate: ≥ 95% of governed calls routed via HAMR |
| `stale` | `false` | AC5 gate: quota data is fresh (< 6h) |

If `stale=true`, the cron has not run. Check: `crontab -l | grep hamr`.

## Step 4 — Inspect local telemetry

```bash
tail -20 logs/cost-telemetry.jsonl | jq '{provider,tier,hamr_routed}'
```

Every record where `hamr_routed: true` counts toward `hit_rate_7d`. Records
with `hamr_routed: false` are leakage — investigate wrapper coverage.

## Step 5 — Verify model-tier coverage (AC8)

At least one governed call per tier must route through HAMR. Check:

```bash
jq -r 'select(.hamr_routed==true) | .tier' logs/cost-telemetry.jsonl \
  | sort -u
```

Expected output includes at least: `free`, `fleet`, `premium`. If a tier is
absent, either no calls have been made in that tier during the window, or the
wrapper is not applied to that tier's call site.

## Step 6 — Post evidence to Epic #1130

When all thresholds pass, post a comment on #1130 with:
- `hit_rate_7d` value and measurement window dates
- `stale` field value at time of reading
- Model-tier coverage table from Step 5
- Data source: `logs/cost-telemetry.jsonl` + Worker `/quota` endpoint

Then check off AC4, AC5, and AC8 on #1130. **Do not check them before
evidence is posted.**

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `stale=true` always | Cron not running | `npm run hamr:install-cron` |
| `hit_rate_7d` < 0.95 | Wrapper missing on some call sites | Audit `wrapProviderCall` usage |
| Tier absent from Step 5 | No calls in tier during window | Wait or make a test call |
| `sync-verify` fails | Scripts not deployed | `npm run deploy:both:apply` |

## Related

- `instructions/hamr-routing.instructions.md` — canonical routing contract
- `scripts/global/hamr-provider-wrapper.js` — wrapper implementation
- `logs/cost-telemetry.jsonl` — per-call routing records
- Epic #1130 — HAMR cross-team routing adoption
- #1369 (D-1130-V1) — evidence collection ticket for AC4/AC5/AC8
