# How to select test_strategy (Epic #1875)

Manager declares `test_strategy` per `MANAGER_HANDOFF`. The validator enforces evidence per
`instructions/test-methodology-matrix.instructions.md`. This guide walks you through selection.

## Quick decision tree

1. **Trivial change?** (typo, formatting, version bump, lockfile) → `test_strategy: none`.
2. **Docs / instructions / wiki?** → `test_strategy: drift-lint` (or `peer-review` for research).
3. **UI / dashboard?** → `test_strategy: visual-regression`.
4. **CI / workflow?** → `test_strategy: golden-file`.
5. **LLM prompts / agents / skills?** → `test_strategy: eval-harness`.
6. **Single config value?** → `test_strategy: manual-verify`.
7. **Code change?** → default `test_strategy: tdd-pyramid`, then check stress applicability below.

## Stress applicability (Epic #1875)

A surface REQUIRES `stress-test` in addition to its primary strategy when ANY of:

- **Concurrency**: code runs under parallel invocation (locks, leases, registries, queue consumers).
- **State mutation**: code writes to shared state (files, registries, JSONL append, IPC).
- **Untrusted input parsing**: code processes input from external sources (PR/comment bodies, fetched URLs).
- **Perf budget declared**: any module publishing an SLO or "should complete in N ms".

Declare as `test_strategy: tdd-pyramid+stress-test` (or appropriate primary + stress).

A surface does NOT require `stress-test` when ALL of:

- Pure read-only function (no IO beyond reading committed config)
- Invoked once per process lifecycle (CLI utilities, one-shot scripts)
- Trivially-bounded input (config values, version bumps, formatting fixes)
- Documentation generation with no runtime consumers

## What counts as stress evidence

Provide ONE:

- `tests/stress-<name>.spec.js` file in PR diff, asserting:
  - ≥1 chaos / fault-injection path (G6 resilience)
  - ≥1 p99 latency budget (G7 throughput)
- `npm run stress:<suite>` invocation cited in `COLLABORATOR_HANDOFF` Pre-handoff verification.

## Canonical examples (from Epic #1871)

| Spec | Demonstrates |
|---|---|
| `tests/stress-worktree-isolation.spec.js` | 20-process concurrency; corruption recovery; PID-grace chaos; p99 acquire <50ms |
| `tests/stress-anneal-decision.spec.js` | Adversarial corpus precision/recall floors; 100-iter fuzz; p99 detector <5ms |
| `tests/stress-rebase-discipline.spec.js` | 1000-tuple tier fuzz; monotonicity; p99 evaluate/predict budgets |

## What stress is NOT

- Not a substitute for unit tests — stress runs ALONGSIDE primary strategy.
- Not "more unit tests" — stress targets concurrency / chaos / adversarial / perf, not correctness.
- Not "flaky integration tests" — stress assertions must be deterministic (use bounded budgets,
  not "should usually pass" semantics).
- Not mutation testing or formal verification (different test classes).

## How to invoke

```bash
npm run stress:test                # all stress suites (orchestrated; emits OTel events)
npm run stress:worktree            # individual suite
node scripts/global/stress-surface-audit.js --json   # find modules needing stress backfill
```

## Promotion model (no calendar threshold)

- **NEW surfaces** shipped after Epic #1875 lands: stress-test is required from day 0 (blocking).
- **EXISTING surfaces** (backfill list from `stress-surface-audit.js`): advisory until per-validator
  replay-eval reaches ≥85% precision against historical PR corpus (Epic #1771 pattern).
- Promotion is replay-eval-gated, not time-gated. No "first N days" advisory window.

## Related contracts

- `instructions/test-methodology-matrix.instructions.md` — authoritative surface→strategy table
- `scripts/global/stress-evidence-check.js` — closeout-schema validator
- `.github/workflows/stress-evidence.yml` — CI advisory gate
- `scripts/global/stress-surface-audit.js` — backfill audit
- `scripts/global/stress-runner.js` — orchestrator + telemetry
