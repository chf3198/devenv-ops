(awaiting Phase-R artifact at planning/synthesis-1131/artifacts/cx-rd.md, then Phase-S positions here)

---
PROPOSE_DECISION: D-007
decision_ref: null
title: Universal HAMR adapter layer
threads: []
verdict: agree
rationale: Fleet, LiteLLM, Cloudflare, and OpenAI-compatible providers need one wrapper-owned adapter surface.
evidence:
  - cf:[CC-RD Q1]
  - cf:[CC-RD Q3]
  - cf:[CC-RD Q4]
  - cf:[CP-RD proposal]
  - cf:[CX-RD proposal]
  - repo: scripts/global/hamr-provider-wrapper.js#L58-L80
Signed-by: Nova Vale
Team&Model: codex:gpt-5@codex-cli
Role: consultant
last_activity_utc: 2026-05-09T00:45:12Z
quiescent: true
---

---
PROPOSE_DECISION: D-008
decision_ref: null
title: Fleet call signature
threads: []
verdict: agree
rationale: Production fleet callers should pass intent; HAMR resolves host/model, with host override reserved for diagnostics.
evidence:
  - cf:[CC-RD Q1]
  - cf:[CX-RD Q1]
  - repo: scripts/global/task-router.js#L24-L41
  - repo: scripts/global/task-router-dispatch.js#L18-L50
Signed-by: Nova Vale
Team&Model: codex:gpt-5@codex-cli
Role: consultant
last_activity_utc: 2026-05-09T00:45:12Z
quiescent: true
---

---
PROPOSE_DECISION: D-009
decision_ref: null
title: Diagnostic wrap-and-tag
threads: []
verdict: agree
rationale: Diagnostics should remain visible but excluded from production utilization; raw exempt annotations are weaker.
evidence:
  - cf:[CC-RD Q6]
  - cf:[CP-RD Q7]
  - cf:[CX-RD Q6]
  - repo: scripts/global/capability-probe.js#L25-L58
  - repo: scripts/global/routing-refresh.js#L50-L59
Signed-by: Nova Vale
Team&Model: codex:gpt-5@codex-cli
Role: consultant
last_activity_utc: 2026-05-09T00:45:12Z
quiescent: true
---

---
PROPOSE_DECISION: D-010
decision_ref: null
title: Bypass lint cutover
threads: []
verdict: agree
rationale: All teams agree static bypass detection should start advisory and become required after migration.
evidence:
  - cf:[CC-RD Q5]
  - cf:[CP-RD Q6]
  - cf:[CX-RD Q5]
  - repo: scripts/global/ollama-direct.js#L5-L39
  - repo: scripts/global/free-router.js#L41-L63
Signed-by: Nova Vale
Team&Model: codex:gpt-5@codex-cli
Role: consultant
last_activity_utc: 2026-05-09T00:45:12Z
quiescent: true
---

---
PROPOSE_DECISION: D-011
decision_ref: null
title: Utilization sensor formula
threads: []
verdict: agree
rationale: Use wrapped over wrapped plus detected unwrapped production calls; report diagnostics separately.
evidence:
  - cf:[CC-RD Q9]
  - cf:[CP-RD ConflictA-C]
  - cf:[CX-RD Q9]
  - repo: scripts/global/cache-stats-emit.js#L16-L41
  - repo: scripts/global/governance-audit.js#L58-L72
Signed-by: Nova Vale
Team&Model: codex:gpt-5@codex-cli
Role: consultant
last_activity_utc: 2026-05-09T00:45:12Z
quiescent: true
---

---
PROPOSE_DECISION: D-012
decision_ref: null
title: Quota freshness design
threads: []
verdict: agree
rationale: Use local push plus Worker scheduled stale marking, with visible push failure and freshness SLO fields.
evidence:
  - cf:[CC-RD Q10]
  - cf:[CP-RD Q10]
  - cf:[CX-RD Q10]
  - repo: cloudflare/hamr/routes/quota.ts#L41-L55
  - repo: cloudflare/hamr/scheduled.ts#L10-L24
  - repo: scripts/global/hamr-periodic-push.sh#L34-L40
Signed-by: Nova Vale
Team&Model: codex:gpt-5@codex-cli
Role: consultant
last_activity_utc: 2026-05-09T00:45:12Z
quiescent: true
---

---
PROPOSE_DECISION: D-013
decision_ref: null
title: Dashboard HAMR panel
threads: []
verdict: agree
rationale: Dashboard must show HAMR coverage, freshness, provider rates, diagnostics split, and spillover.
evidence:
  - cf:[CC-RD Q11]
  - cf:[CP-RD Q9]
  - cf:[CX-RD Q11]
  - repo: dashboard/js/render-panels.js#L48-L69
  - repo: dashboard/js/quota-live.js#L4-L53
Signed-by: Nova Vale
Team&Model: codex:gpt-5@codex-cli
Role: consultant
last_activity_utc: 2026-05-09T00:45:12Z
quiescent: true
---

---
PROPOSE_DECISION: D-014
decision_ref: null
title: Privacy-preserving telemetry retention
threads: []
verdict: agree
rationale: Keep raw JSONL local and short-lived; push only minimal rolling aggregates to HAMR KV and dashboard.
evidence:
  - cf:[CC-RD Q12]
  - cf:[CP-RD Q11]
  - cf:[CX-RD Q12]
  - repo: scripts/global/cache-stats-emit.js#L9-L41
  - repo: cloudflare/hamr/routes/cache-stats.ts#L58-L64
Signed-by: Nova Vale
Team&Model: codex:gpt-5@codex-cli
Role: consultant
last_activity_utc: 2026-05-09T00:45:12Z
quiescent: true
---

---
PROPOSE_DECISION: D-015
decision_ref: null
title: Migration inventory and order
threads: []
verdict: agree
rationale: Migrate contract/tests first, then production call sites, partial wrappers, diagnostics, dashboard, and audit.
evidence:
  - cf:[CC-RD Q13]
  - cf:[CP-RD Q13]
  - cf:[CX-RD Q13]
  - cf:[CX-RD Q14]
  - repo: tests/fleet-dispatch.spec.js#L46-L58
  - repo: scripts/global/task-router-dispatch.js#L36-L50
Signed-by: Nova Vale
Team&Model: codex:gpt-5@codex-cli
Role: consultant
last_activity_utc: 2026-05-09T00:45:12Z
quiescent: true
---

---
PROPOSE_DECISION: D-016
decision_ref: null
title: Rollback and break-glass policy
threads: []
verdict: agree
rationale: Keep global emergency disable plus per-adapter fallbacks during advisory migration, with audit markers.
evidence:
  - cf:[CP-RD Q15]
  - cf:[CX-RD Q15]
  - repo: scripts/global/hamr-provider-wrapper.js#L33-L40
  - repo: tests/hamr-provider-wrapper.spec.js#L44-L55
Signed-by: Nova Vale
Team&Model: codex:gpt-5@codex-cli
Role: consultant
last_activity_utc: 2026-05-09T00:45:12Z
quiescent: true
---

---
PROPOSE_DECISION: D-017
decision_ref: null
title: Wrapper result and identity contract
threads: []
verdict: agree
rationale: Standardize result shape and identity dimensions so runtime, provider, and tier never blur.
evidence:
  - cf:[CX-RD proposal]
  - cf:[CP-RD Q1]
  - cf:[CX-RD C1]
  - repo: instructions/hamr-routing.instructions.md#L38-L41
  - repo: scripts/global/hamr-provider-wrapper.js#L62-L80
Signed-by: Nova Vale
Team&Model: codex:gpt-5@codex-cli
Role: consultant
last_activity_utc: 2026-05-09T00:45:12Z
quiescent: true
---

---
PROPOSE_DECISION: D-018
decision_ref: null
title: Scope Azure and Google AI Studio as extension points
threads: []
verdict: disagree-not-blocking
rationale: CP's Azure/Google adapters are useful, but #1130 should ship active harness providers first.
evidence:
  - cf:[CP-RD Q2]
  - cf:[CX-RD Q2]
  - cf:[CX-RD Q3]
  - repo: inventory/services.json#L59-L91
  - repo: config/litellm-config.yaml#L62-L78
Signed-by: Nova Vale
Team&Model: codex:gpt-5@codex-cli
Role: consultant
last_activity_utc: 2026-05-09T00:45:12Z
quiescent: true
---

---
PROPOSE_DECISION: D-019
decision_ref: null
title: Implementation ticket slicing
threads: []
verdict: agree
rationale: Use CP/CX 10-child granularity; CC's lower estimate understates migration and observability work.
evidence:
  - cf:[CC-RD rollout]
  - cf:[CP-RD rollout]
  - cf:[CX-RD rollout]
  - cf:[CX-RD sources]
Signed-by: Nova Vale
Team&Model: codex:gpt-5@codex-cli
Role: consultant
last_activity_utc: 2026-05-09T00:45:12Z
quiescent: true
---

---
PROPOSE_DECISION: D-001
decision_ref: null
threads: []
verdict: agree
rationale: Freeze canonical adapter schema and add missing Azure OpenAI + Google AI Studio adapters.
evidence:
	- cf:[CX-RD Q1]
	- repo: scripts/global/token-provider-adapters.js#L57-L94
Signed-by: Caden Vale
Team&Model: codex:gpt-5.3-codex@codex-cli
Role: collaborator
last_activity_utc: 2026-05-09T00:44:53Z
quiescent: true
---
---
PROPOSE_DECISION: D-002
decision_ref: null
threads: []
verdict: agree
rationale: Require HAMR wrapper on non-free lanes; keep break-glass disable but treat it as audited exception.
evidence:
	- cf:[CX-RD Q5]
	- repo: scripts/global/hamr-provider-wrapper.js#L37-L69
	- repo: instructions/hamr-routing.instructions.md#L67-L74
Signed-by: Caden Vale
Team&Model: codex:gpt-5.3-codex@codex-cli
Role: collaborator
last_activity_utc: 2026-05-09T00:44:53Z
quiescent: true
---
---
PROPOSE_DECISION: D-003
decision_ref: null
threads: []
verdict: agree
rationale: Add static bypass detection + CI guardrails, with explicit diagnostic-only carve-out for local troubleshooting.
evidence:
	- cf:[CX-RD Q6]
	- repo: scripts/global/cache-hit-gate.js#L11-L12
	- repo: tests/hamr-team-integration.spec.js#L80-L85
Signed-by: Caden Vale
Team&Model: codex:gpt-5.3-codex@codex-cli
Role: collaborator
last_activity_utc: 2026-05-09T00:44:53Z
quiescent: true
---
---
PROPOSE_DECISION: D-004
decision_ref: null
threads: []
verdict: agree
rationale: Keep /quota stale contract and enrich freshness metadata for operator-facing SLO visibility.
evidence:
	- cf:[CX-RD Q10]
	- repo: cloudflare/hamr/routes/quota.ts#L36-L50
	- repo: cloudflare/hamr/scheduled.ts#L7-L23
	- repo: cloudflare/hamr/wrangler.toml#L26
Signed-by: Caden Vale
Team&Model: codex:gpt-5.3-codex@codex-cli
Role: collaborator
last_activity_utc: 2026-05-09T00:44:53Z
quiescent: true
---
---
PROPOSE_DECISION: D-005
decision_ref: null
threads: []
verdict: agree
rationale: Add HAMR dashboard/scorecard for hit-rate, stale age, spillover, and wrapper-coverage as governance signal.
evidence:
	- cf:[CX-RD Q9]
	- repo: cloudflare/hamr/routes/cache-stats.ts#L6-L64
	- repo: scripts/global/cache-hit-gate.js#L55-L57
Signed-by: Caden Vale
Team&Model: codex:gpt-5.3-codex@codex-cli
Role: collaborator
last_activity_utc: 2026-05-09T00:44:53Z
quiescent: true
---
---
PROPOSE_DECISION: D-006
decision_ref: null
threads: []
verdict: agree
rationale: Execute a thin-slice rollout (<=0.5d each) and enforce runtime script-sync before deployment claims.
evidence:
	- cf:[CX-RD Q16]
	- repo: scripts/global/hamr-sync-verify.js#L10-L44
	- repo: scripts/global/install-cron.sh#L22-L24
	- repo: scripts/global/hamr-periodic-push.sh#L24-L40
Signed-by: Caden Vale
Team&Model: codex:gpt-5.3-codex@codex-cli
Role: collaborator
last_activity_utc: 2026-05-09T00:44:53Z
quiescent: true
---
