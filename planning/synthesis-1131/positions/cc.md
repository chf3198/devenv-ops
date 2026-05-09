# Claude Code Team — Position Log (synthesis-1131)

Append-only. CC writes this file only. Admin scope (CC also serves as admin) does NOT use this file for state changes.

---

PROTOCOL_ACK: true
read:
  - planning/protocol.md
  - planning/synthesis-1131/KICKOFF.md
  - planning/synthesis-1131/artifacts/INDEX.md
  - planning/synthesis-1131/artifacts/cc-rd.md
  - planning/synthesis-1131/artifacts/cp-rd.md (recovered from git history; Copilot's substrate-correct work)
  - planning/synthesis-1131/artifacts/cx-rd.md (Codex's work)
Signed-by: Orla Harper
Team&Model: claude-code:opus-4-7@anthropic
Role: collaborator
last_activity_utc: 2026-05-08T20:05:00Z

---

## Phase-S Wave 1: candidate decisions proposed by CC

Below: 16 PROPOSE_DECISION blocks based on cross-team finding map in INDEX.md. CP + CX position on each.

---
PROPOSE_DECISION: D-001
title: Build fleet adapter shim closing 0% utilization gap
threads: []
rationale: 3-team agree (CC Q1, CP Q5 wrapper enforcement, CX Q1 fleetCall). All three propose; only naming differs.
evidence:
  - cf:[CC-RD Q1]
  - cf:[CP-RD Q5]
  - cf:[CX-RD Q1]
verdict: agree
Signed-by: Orla Vale
Team&Model: claude-code:opus-4-7@anthropic
Role: consultant
last_activity_utc: 2026-05-08T20:05:00Z
quiescent: true
---
PROPOSE_DECISION: D-002
title: Wrap LiteLLM, don't replace it
threads: []
rationale: 3-team agree. Existing LiteLLM routing/retry preserved; HAMR adds cost/observability around it.
evidence:
  - cf:[CC-RD Q4]
  - cf:[CX-RD Q4]
verdict: agree
Signed-by: Orla Vale
Team&Model: claude-code:opus-4-7@anthropic
Role: consultant
last_activity_utc: 2026-05-08T20:05:00Z
quiescent: true
---
PROPOSE_DECISION: D-003
title: Bypass-detect lint, advisory then required progression
threads: []
rationale: 3-team agree. CC `lint-hamr-bypass.js`, CX `hamr-coverage-lint.js`, CP static patterns. Reconcile name in implementation.
evidence:
  - cf:[CC-RD Q5]
  - cf:[CP-RD Q6]
  - cf:[CX-RD Q5]
verdict: agree
Signed-by: Orla Vale
Team&Model: claude-code:opus-4-7@anthropic
Role: consultant
last_activity_utc: 2026-05-08T20:05:00Z
quiescent: true
---
PROPOSE_DECISION: D-004
title: Diagnostic carve-out — wrap-and-tag (NOT exempt-via-annotation)
threads: []
rationale: CC initially proposed exempt-via-annotation; CP and CX both prefer wrap-and-tag with `tier:'diagnostic'`. CC concedes — tagging beats exempting for observability.
evidence:
  - cf:[CC-RD Q6] (superseded)
  - cf:[CP-RD Q7]
  - cf:[CX-RD Q6]
verdict: agree
Signed-by: Orla Vale
Team&Model: claude-code:opus-4-7@anthropic
Role: consultant
last_activity_utc: 2026-05-08T20:05:00Z
quiescent: true
---
PROPOSE_DECISION: D-005
title: Goal Health Score sensor — CX formula handles missing data
threads: []
rationale: CX `wrapped/(wrapped + detected_unwrapped)` excluding diagnostics is more robust than CC's `wrapped/total`. CP `hamr:wrapper-utilization` audit aligns.
evidence:
  - cf:[CC-RD Q9] (superseded)
  - cf:[CP-RD Q8] (audit check)
  - cf:[CX-RD Q9]
verdict: agree
Signed-by: Orla Vale
Team&Model: claude-code:opus-4-7@anthropic
Role: consultant
last_activity_utc: 2026-05-08T20:05:00Z
quiescent: true
---
PROPOSE_DECISION: D-006
title: /quota always-fresh — local push cron + Worker scheduled + visible push-failure state + 12h SLO
threads: []
rationale: CC + CP + CX all converge on belt+suspenders dual-source. CP adds 12h SLO alarm, CX adds visible push-failure state. Adopt union.
evidence:
  - cf:[CC-RD Q10]
  - cf:[CP-RD Q12]
  - cf:[CX-RD Q10]
verdict: agree
Signed-by: Orla Vale
Team&Model: claude-code:opus-4-7@anthropic
Role: consultant
last_activity_utc: 2026-05-08T20:05:00Z
quiescent: true
---
PROPOSE_DECISION: D-007
title: openai-compat adapter for Cerebras/Groq with provider_id tag
threads: []
rationale: Single adapter accepting provider_id parameter. CC + CX agree; CP silent.
evidence:
  - cf:[CC-RD Q3]
  - cf:[CX-RD Q3]
verdict: agree
Signed-by: Orla Vale
Team&Model: claude-code:opus-4-7@anthropic
Role: consultant
last_activity_utc: 2026-05-08T20:05:00Z
quiescent: true
---
PROPOSE_DECISION: D-008
title: Cloudflare Workers AI adapter (LiteLLM-first per CX)
threads: []
rationale: CX proposes LiteLLM as primary path with direct adapter only when needed. CC proposes direct adapter. CX path is simpler given LiteLLM gateway already wraps providers.
evidence:
  - cf:[CC-RD Q2] (superseded)
  - cf:[CX-RD Q2]
verdict: agree
Signed-by: Orla Vale
Team&Model: claude-code:opus-4-7@anthropic
Role: consultant
last_activity_utc: 2026-05-08T20:05:00Z
quiescent: true
---
PROPOSE_DECISION: D-009
title: Add Azure/Google AI Studio adapters (CP-only proposal)
threads: []
rationale: CP-unique finding. Useful for Anthropic-alternative free-tier coverage. Low priority unless those providers get used.
evidence:
  - cf:[CP-RD Q2]
verdict: disagree-not-blocking
Signed-by: Orla Vale
Team&Model: claude-code:opus-4-7@anthropic
Role: consultant
last_activity_utc: 2026-05-08T20:05:00Z
quiescent: true
---
PROPOSE_DECISION: D-010
title: Wrapper result contract standardization {ok, value, sticky, spillover, meta}
threads: []
rationale: CX-only formal proposal. Standardizing return shape means callers can rely on the structure. Worth the migration cost.
evidence:
  - cf:[CX-RD proposal item 2]
verdict: agree
Signed-by: Orla Vale
Team&Model: claude-code:opus-4-7@anthropic
Role: consultant
last_activity_utc: 2026-05-08T20:05:00Z
quiescent: true
---
PROPOSE_DECISION: D-011
title: Provider-identity dimension explicit (runtime + provider + tier)
threads: []
rationale: CX-explicit, CP-implicit (in adapter schema). Makes telemetry queryable by team-runtime, provider, tier separately.
evidence:
  - cf:[CX-RD proposal item 4]
  - cf:[CP-RD Q1] (implicit)
verdict: agree
Signed-by: Orla Vale
Team&Model: claude-code:opus-4-7@anthropic
Role: consultant
last_activity_utc: 2026-05-08T20:05:00Z
quiescent: true
---
PROPOSE_DECISION: D-012
title: MEGINGJORD_HAMR_DISABLED=1 break-glass + audit-log marker (CP unique)
threads: []
rationale: CP proposes audit-log when set in CI/dev scripts. CX proposes per-adapter rollback while lint advisory. Both compatible.
evidence:
  - cf:[CP-RD Q15]
  - cf:[CX-RD Q15]
verdict: agree
Signed-by: Orla Vale
Team&Model: claude-code:opus-4-7@anthropic
Role: consultant
last_activity_utc: 2026-05-08T20:05:00Z
quiescent: true
---
PROPOSE_DECISION: D-013
title: hamr-sync-verify as release gate
threads: []
rationale: CP-only explicit. Strengthens runtime parity check before deploy. Aligns with #1118 D-006 sync-verification we just shipped.
evidence:
  - cf:[CP-RD Q14]
verdict: agree
Signed-by: Orla Vale
Team&Model: claude-code:opus-4-7@anthropic
Role: consultant
last_activity_utc: 2026-05-08T20:05:00Z
quiescent: true
---
PROPOSE_DECISION: D-014
title: /quota enrichment — last_update_ms + freshness_slo_ms fields
threads: []
rationale: CP-only proposal. Better operator UX for staleness diagnosis. Cheap to add.
evidence:
  - cf:[CP-RD Q10]
verdict: agree
Signed-by: Orla Vale
Team&Model: claude-code:opus-4-7@anthropic
Role: consultant
last_activity_utc: 2026-05-08T20:05:00Z
quiescent: true
---
PROPOSE_DECISION: D-015
title: Effort baseline ~4.5-5.0d (10 children @ 0.5d each)
threads: []
rationale: CP estimates 5.0d, CX 4.4d, CC 2.1d. CC concedes — own estimate under-scoped given CX inventory of 13 surfaces. Use 4.5-5.0d as planning baseline.
evidence:
  - cf:[CC-RD rollout] (superseded)
  - cf:[CP-RD rollout]
  - cf:[CX-RD rollout]
verdict: disagree-not-blocking
Signed-by: Orla Vale
Team&Model: claude-code:opus-4-7@anthropic
Role: consultant
last_activity_utc: 2026-05-08T20:05:00Z
quiescent: true
---
PROPOSE_DECISION: D-016
title: Migration order — high-volume production paths first; diagnostics last
threads: []
rationale: CX explicit ordering (contract+tests → high-volume production → partial wrappers → diagnostics → dashboard → audit). CP "scripts/global direct callers first". Both align on production-first.
evidence:
  - cf:[CC-RD Q14]
  - cf:[CP-RD Q13]
  - cf:[CX-RD Q14]
verdict: agree
Signed-by: Orla Vale
Team&Model: claude-code:opus-4-7@anthropic
Role: consultant
last_activity_utc: 2026-05-08T20:05:00Z
quiescent: true
---
