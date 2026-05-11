# Synthesis Artifact: Epic #1133 — Automate Self-Annealing

**Status:** complete | **Epic:** #1133 | **Date:** 2026-05-11
**Team&Model:** curtisfranks + GitHub Copilot (Claude Sonnet 4.6)

---

## Problem Statement

The harness had self-annealing infrastructure (`skills/workflow-self-anneal/`) that only
fired on manual invocation. Recurring failure patterns crossed detection thresholds with no
automated response. The CHANGELOG.md merge-conflict pattern appeared twice in a single session
before it was manually noticed and filed as #1132.

This is a meta-quality gap: the system designed to catch recurring issues failed to catch a
recurring issue.

---

## Phase-0 R&D Decisions

### D1 — Persistence schema

`~/.megingjord/incidents.jsonl` — append-only NDJSON, schema v2:

```json
{
  "schema_version": 2,
  "pattern_id": "<string>",
  "sensor": "<string>",
  "status": "pending|proposed|resolved",
  "timestamp": "<ISO-8601>",
  "bucketed_at": "<ISO-8601>",
  "session_id": "<string>",
  "evidence": {},
  "proposal_id": "<string>",
  "dedupe_key": "<string>"
}
```

Rotation: cap at 2 000 lines, archive surplus to `incidents.<date>.jsonl.bak` in same dir.

### D2 — Pattern catalog seed (8 patterns, v1)

| pattern_id | threshold | primary remediation |
|---|---|---|
| changelog-conflict | 2 in 7d | per-ticket changelog fragments |
| branch-name-rejection | 2 in 14d | pre-push hook + docs update |
| signature-variance | 2 in 14d | normalize alias in registry |
| evidence-completeness-race | 2 in 14d | 90s wait gate before PR |
| admin-signer-non-independence | 1 in 30d | enforce distinct aliases |
| pre-commit-amend | 3 in 7d | audit log + ruleset block |
| file-over-100-lines | 2 in 30d | extract helper or lint waiver |
| worktree-governance-violation | 1 in 14d | one-worktree-per-agent rule |

Full catalog: `scripts/global/anneal-pattern-catalog.js`

### D3 — Actuator decision matrix

| Condition | Action |
|---|---|
| threshold not crossed | record event only |
| threshold crossed + not suppressed + not duped | file proposal ticket (Tier-2) |
| threshold crossed + suppressed | skip; log suppression hit |
| dedupe_key matches open ticket | skip; do not duplicate |
| Tier-3 (≥5 proposals, same pattern, 30d) | consider new Epic |

### D4 — Threshold tuning rationale

False-positive risk: lower threshold (1 occurrence) risks noise on coincidental failures.
False-negative risk: higher threshold (≥5) lets patterns persist too long.
Resolution: default 2-in-7d for high-impact patterns; 1-in-30d for governance violations
(even one occurrence of admin non-independence is unacceptable).

### D5 — False-positive mitigation

- Suppression registry with TTL (default 30 days)
- Operator review CLI (`npm run anneal:review`) for accept/reject
- `anneal-kill-switch.js` single-flight + rate guard prevents CI storms

### D6 — Cross-team agreement

All three teams (CC/CP/CX) agreed on the 8-pattern seed list at Epic #1133 scope definition.
Threshold values are advisory; operator may override via suppression TTL or kill switch.

---

## Implementation Summary

| AC | File(s) | Status |
|---|---|---|
| AC2 | `workflow-anneal-detect.js`, CI workflow | ✅ |
| AC3 | `anneal-pattern-catalog.js` | ✅ |
| AC4 | `anneal-log-rotate.js` | ✅ |
| AC5 | `anneal-tier2-autofile.js` (proposal_id, dedupe_key) | ✅ |
| AC6 | `anneal-review.js` (reject/list CLI) | ✅ |
| AC7 | `anneal-review.js` (TTL suppression) | ✅ |
| AC8 | `anneal-tier2-autofile.spec.js` (synthetic fixture) | ✅ |
| AC9 | `anneal-audit-sensor.js` → `governance-audit.js` | ✅ |

---

## Open Risks

1. `governance-audit.js` is 140 lines (pre-existing over-limit). Tagged for future refactor.
2. Incidents file must be seeded by a live CI run before Tier-2 proposals activate.
3. Kill switch must be re-enabled after any manual `workflow_runs` disable event.
