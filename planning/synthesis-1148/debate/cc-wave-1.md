---
phase: D
wave: 1
team: cc
synthesis: synthesis-1148
parent_epic: 1130
last_activity_utc: 2026-05-09T06:50:00Z
---

# CC Wave 1 — Phase-D Debate

## Reading log (peer artifacts read this wave per Phase-D rules)

- planning/synthesis-1148/artifacts/cp-rd.md (315 lines, 8 web + 27 repo, F1-F8 findings)
- planning/synthesis-1148/artifacts/cx-rd.md (349 lines, 8 web + 31 repo, control-plane framing)

## Top 3 agreements with peer artifacts

```yaml
- point: "wrapProviderCall stays the single instrumentation boundary; do NOT replace LiteLLM"
  cite_team: cp
  cite_artifact: rd
  cite_section: "Opinionated design proposal item 1"
  evidence:
    - cf:[CP-RD F1] (policy/implementation gap real)
    - cf:[CC-RD Q4] (wrap not replace)
    - cf:[CX-RD #80] (wrapper applies sticky route, cache headers, stats emission)
    - repo: scripts/global/hamr-provider-wrapper.js#L43-L55
- point: "diagnostic carve-out: wrap-and-tag with `tier: diagnostic`, NOT exempt"
  cite_team: cp
  cite_artifact: rd
  cite_section: "Proposal point 7"
  evidence:
    - cf:[CP-RD proposal point 7]
    - cf:[CC-RD Q6] (CC concession)
    - cf:[CX-RD #50-#52] (cost levers + boundary rule)
- point: "bypass-detect lint, advisory then required progression"
  cite_team: cp
  cite_artifact: rd
  cite_section: "Proposal point 3 + Rollout step 4-9"
  evidence:
    - cf:[CC-RD Q5]
    - cf:[CP-RD F5+rollout]
    - cf:[CX-RD evidence-gate-contract]
```

## Top 3 disagreements (with NEW websearch + repo evidence)

```yaml
- point: "CC's effort estimate (~2.2d, 5 PRs) was too small. CP/CX granularity (~5d, 10 children) is more honest."
  rationale: "CC underestimated provider-cache-economics work. Evidence below shows
    Anthropic vs OpenAI vs Gemini cache APIs differ MATERIALLY in shape — separate adapter
    work per provider is necessary, not optional."
  new_evidence:
    - websearch: https://www.prompthub.us/blog/prompt-caching-with-openai-anthropic-and-google-models (accessed 2026-05-09T06:48:00Z) — explicit comparison: OpenAI uses `cached_tokens` in `prompt_tokens_details`; Anthropic uses `cache_creation_input_tokens` + `cache_read_input_tokens`; Gemini uses context-cache-storage pricing
    - websearch: https://platform.claude.com/docs/en/build-with-claude/prompt-caching (accessed 2026-05-09T06:48:00Z) — Anthropic requires explicit `cache_control` on content blocks; not automatic
    - repo: scripts/global/token-provider-adapters.js#L12-L24 (anthropic adapter only normalizes 5 fields; misses cache_creation_input_tokens semantic)
  concession: yes — CC's ~2.2d was tactical-only; rollout to ~5d as CP/CX scoped is correct.

- point: "CC didn't address provider-cache-economics harmonization explicitly"
  rationale: "CP F4 surfaces this clearly. Same input prompt produces materially different
    cache-cost reports across OpenAI vs Anthropic vs Gemini. Just normalizing token
    counts without normalizing cache-write vs cache-read semantics will under-report
    Anthropic costs and over-report OpenAI savings."
  new_evidence:
    - websearch: https://docs.litellm.ai/docs/completion/prompt_caching (accessed 2026-05-09T06:48:00Z) — LiteLLM's own normalization keeps provider-native fields and adds canonical `cache_read_input_tokens` + `cache_creation_input_tokens` aliases
    - websearch: https://portkey.ai/docs/integrations/llms/anthropic/prompt-caching (accessed 2026-05-09T06:48:00Z) — Portkey ships separate cost-tracking entries per cache field
    - repo: scripts/global/cache-stats-emit.js#L26-L41 (current schema lacks per-cache-event-type granularity)
  concession: CP's F4 is correct; CC will adopt CP's normalization stance.

- point: "CC framed coverage as a wrapper-adoption project; CX framed it as a control-plane problem"
  rationale: "CX's framing is industry-aligned. 'LLM Control Plane' is a real architectural
    pattern in 2026 (IBM, Atlan, multiple Medium analyses). CC's tactical scope misses the
    activation/adapter/evidence-gate three-layer structure that makes coverage AUDITABLE,
    not just functional."
  new_evidence:
    - websearch: https://atlan.com/know/ai-control-plane/ (accessed 2026-05-09T06:48:00Z) — AI Control Plane components include policy enforcement, telemetry collection, drift detection — matching CX's evidence-gate-contract layer
    - websearch: https://medium.com/@adnanmasood/llm-gateways-for-enterprise-risk-building-an-ai-control-plane-e7bed1fdcd9c (accessed 2026-05-09T06:48:00Z) — gateway IS the enforcement component within the control plane; supports CX's three-layer model
    - repo: scripts/global/hamr-activate.sh#L12-L31 (activation contract layer already exists; CX correctly identified it)
  concession: CC adopts CX's three-layer framing as the architectural skeleton; rollout sequenced per layer.
```

## Top 3 challenges (with NEW websearch evidence)

```yaml
- target_team: cp
  target_claim: "Add explicit Azure-OpenAI and Google-AI-Studio adapters as a foundation step (CP rollout items 2-3)"
  challenge: "Are these adapters justified by ACTUAL harness consumption, or speculative? The harness today doesn't route to Azure or Google AI Studio. Adding adapters before consumption creates dead code."
  new_evidence:
    - websearch: https://docs.litellm.ai/docs/completion/prompt_caching (accessed 2026-05-09T06:48:00Z) — LiteLLM ALREADY supports Azure and Google providers via existing adapter; routing through LiteLLM means harness gets these for free without per-provider native adapter
    - repo: config/litellm-config.yaml (current config doesn't include azure-openai or google-ai-studio aliases — confirms zero current consumption)
  proposal: defer adapters until harness explicitly adds those providers as consumed lanes; meanwhile route through LiteLLM if they're ever needed.

- target_team: cx
  target_claim: "Activation contract proves each runtime has HAMR markers; current scripts; non-disabled state — and this is layer-1 of three"
  challenge: "Activation contract overlaps with sync-verify (#1118 D-006 just shipped). Is this layer DUPLICATE or COMPLEMENTARY? If duplicate, simplify to one mechanism."
  new_evidence:
    - repo: scripts/global/hamr-sync-verify.js#L10-L17 — already inventories required HAMR scripts present in each runtime target
    - repo: hooks/scripts/hamr_activation_check.py#L14-L27 — already advisory-checks HAMR config presence at session start
    - websearch: https://api7.ai/blog/ai-agent-control-plane-gateway (accessed 2026-05-09T06:48:00Z) — control-plane activation typically a single phase, not a separately-named layer
  proposal: keep CX's three-layer FRAMING but collapse activation+sync-verify into one mechanism rather than building a new activation-contract layer.

- target_team: cp
  target_claim: "Preserve `raw_usage` passthrough alongside canonical fields"
  challenge: "Backward-compat risk: if `raw_usage` becomes load-bearing (downstream consumers depend on it), schema becomes brittle to provider changes. What's the contract for `raw_usage` evolution?"
  new_evidence:
    - websearch: https://www.prompthub.us/blog/prompt-caching-with-openai-anthropic-and-google-models (accessed 2026-05-09T06:48:00Z) — OpenAI added `cached_tokens` field via API revision; not a stable schema
    - websearch: https://platform.claude.com/docs/en/build-with-claude/prompt-caching (accessed 2026-05-09T06:48:00Z) — Anthropic added per-block cache_control; this is a 2024-2025 API change
  proposal: define `raw_usage` as DEBUG-tier (not consumer-load-bearing); document explicitly that downstream callers MUST use canonical fields. Periodic `raw_usage` schema audit.
```

## New questions emerging from peer review

```yaml
- "How do we handle Codex CLI's sandboxed environment that can't push to remote? Admin-on-behalf commit pattern is workable but needs explicit policy."
- "Does adopting CX's three-layer control-plane framing (activation/adapter/evidence-gate) change Phase-C closeout structure? Each layer might warrant separate child Epics."
- "What's the minimum viable telemetry when a runtime CANNOT expose per-request token usage (CX #19-25 raised this for Codex CLI)? Reconcile via aggregate sources?"
- "Should CP's RFC 9449 DPoP discipline (CP F8) be a hard requirement on HAMR /mcp control-plane calls, or recommended-only?"
```

## PROPOSE_DECISION (title-only; admin assigns D-NNN)

```yaml
- title: "Adopt CX's three-layer framing (activation / adapter / evidence-gate) as the architectural skeleton"
- title: "Adopt CP's provider-harmonized cache-economics normalization (canonical + raw_usage debug-tier)"
- title: "Defer Azure-OpenAI + Google-AI-Studio adapters until harness has explicit consumption"
- title: "Collapse activation-contract layer into existing hamr-sync-verify + hamr_activation_check.py rather than building separately"
- title: "Adopt the v2 admin-durability-commit pattern as documented operating procedure (Codex sandbox can't push)"
```

---

Signed-by: Orla Vale
Team&Model: claude-code:opus-4-7@anthropic
Role: consultant
last_activity_utc: 2026-05-09T06:50:00Z
