---
title: Megingjord Tooling Update Survey — Defects + Ecosystem Evolution
date: 2026-05-06
epic: 987
research-ticket: 988
authored-by: operator-deputy (Claude Code Team runtime)
status: COMPLETE — pending CONSULTANT_CLOSEOUT
---

# Megingjord Tooling Update Survey

## Section A — Defect audit

Empirical defects observed across HAMR Waves 1-8, captured with reproduction triggers.

| # | Defect | Affected | Reproduction trigger | Severity | Recommended fix |
|---|---|---|---|---|---|
| A1 | R9.2 hook over-restricts `--delete` refspecs | `scripts/hooks/pre-push-branch-check.sh` | `git push origin --delete <branch>` from any branch | MED | Skip mismatch check when `local_sha == 0…` (delete sentinel) |
| A2 | Evidence-completeness 60s rule | `.github/workflows` evidence-completeness | Any PR opened within 60s of COLLABORATOR_HANDOFF | HIGH | Either a) reduce to 30s with rate-limit check, or b) auto-comment guidance instead of hard-fail |
| A3 | type:epic blocking on Refs#N | evidence-completeness | PR Refs an Epic instead of a child | HIGH | Allow Refs Epic when paired with `Refs #child-N`; current rule forces filing dummy task tickets |
| A4 | Branch-name binding rule | evidence-completeness | Closeout PR for Epic must rename branch | MED | Permit `feat/<epic>-...` when PR title contains `closeout` keyword |
| A5 | Vale 504 transient | `.github/workflows` lint-required | reviewdog API 504 on check-run create | LOW | Add retry with exponential backoff in vale step |
| A6 | Magic-number lint false positives | `scripts/lint-readability.js` | String literal containing `#NNN` (issue numbers) | LOW | Whitelist `#\d{2,4}` patterns inside string literals |
| A7 | Wiki LLM ingest hard-fails offline | `scripts/wiki/ingest.js` | Run `npm run wiki:ingest` while fleet down | MED | Add deterministic fallback: extract H1 + first paragraph as TLDR when LLM unreachable |
| A8 | `gh issue close` eventual-consistency | `gh` CLI behavior | Close + immediate state read | LOW | Add `--wait` poll wrapper or accept lag in tooling |
| A9 | Pre-push readability gate threshold (420) | `scripts/lint-readability.js` | Cumulative warnings creep over time | MED | Adopt baseline-tracking: fail when delta > 0 from main, not when crossing absolute |
| A10 | Crontab idempotency in CI containers | `scripts/global/install-cron.sh` | CI container without crontab installed | LOW | Already mitigated via skip path in test #953 |
| A11 | Concurrent-checkout work invisible | n/a | Operator commits in parallel session | LOW | Pre-task audit of unexpected branch state (already practiced in operator-identity-context) |

## Section B — Ecosystem-evolution survey

### B1. Cloudflare Workers + wrangler

**Current state**: HAMR Worker (`cloudflare/hamr/`) on wrangler 4.87. Routes split per ≤100-line policy. Cron trigger every 6h. KV + R2 bindings. PUBLISHER_KEYRING via `wrangler secret`.

**New since baseline**:
- **Smart Placement** (`placement = "smart"`): auto-positions Worker near KV/R2 hot paths. Could reduce `/quota` tail latency.
- **Workers Observability v2**: built-in metrics, traces, queries — replaces ad-hoc `x-hamr-elapsed-ms` header instrumentation.
- **Durable Object Facets**: dynamic class instantiation with SQLite. Future fit for per-team state.
- **Tail Workers** (already noted in HAMR v3 research): structured observability sink.

**Recommendation**: ADOPT Workers Observability v2 + Smart Placement. Defer Durable Object Facets until per-team state outgrows KV.

### B2. Anthropic API / SDK

**Current state**: `anthropic-batch-router.js` (#927) + `cache-stats-emit` for prompt-caching telemetry. Cache TTL betas: `prompt-caching-2024-07-31` + `extended-cache-ttl-2025-04-11`.

**New since baseline**:
- **Claude Opus 4.7 tokenizer** (35% more tokens per request vs 4.6) — affects /quota cost calculations.
- **Cache TTL default reverted to 5min** — extended TTL still available but more expensive (2.0× write vs 1.25×).
- **Workspace-level cache isolation** (Feb 5, 2026) — affects multi-team cache visibility.
- **Batch API max output 300K tokens** — useful for wiki:anneal long runs.

**Recommendation**: ADOPT 5-min default with explicit extended-TTL opt-in for high-hit workloads (wiki anneal, rule-coverage stage 2b). Update `cacheHeaders('anthropic')` to thread `extended_cache_ttl` per call.

### B3. OpenAI / Gemini / Groq / Cerebras / OpenRouter

**Current state**: 9 providers covered by `token-provider-adapters.js`. `cacheHeaders` matrix covers Anthropic (extended-cache betas), Gemini (`cachedContent`), Groq/Cerebras/OpenAI (`x-cache-control`).

**New since baseline**:
- **Gemini 2.5 Pro 2M context** — largest in market.
- **Gemini implicit caching** (no manual headers) — simplifies wrapper.
- **OpenAI automatic prefix cache** — same; deprecates explicit `x-cache-control` for OpenAI.
- **Groq + Cerebras** at thousands tok/s — speed-tier candidates for sticky-route fleet lane.

**Recommendation**: SIMPLIFY `cacheHeaders('openai' | 'gemini')` to no-op (automatic). KEEP for Groq/Cerebras (still header-driven). Add Gemini 2.5 Pro to sticky-route `premium` tier.

### B4. LiteLLM

**Current state**: `litellm-client.js` with named groups (`fleet-primary`, `fleet-fast`, `fleet-quality`, `fleet-fallback`). OpenClaw integration via `getOpenClawURL()`.

**New since baseline**:
- v1.81.14 stable (March 2026). 1000 RPS load-tested. SOC-2 Type 2 + ISO 27001.
- Agent Hub + MCP support + sidecar architecture — could replace some HAMR Worker routes.
- Portkey + RelayPlane competitors gaining ground.

**Recommendation**: STAY on LiteLLM (mature). Adopt sidecar architecture for OpenClaw lane to reduce proxy overhead. Defer Portkey/RelayPlane until LiteLLM hits a wall.

### B5. Lint tooling

**Current state**: ESLint 9.39 via `lint-configs/eslint.config.devenv.js`. Custom `scripts/lint.js` for line-length cap + `scripts/lint-readability.js` for naming/magic-number rules.

**New since baseline**:
- **Biome v2.3** — 10-20× faster, type-aware linting (closes ESLint feature gap).
- **Oxlint v0.x** — 50-100× faster, strong ESLint compatibility.
- **Ruff** continues as Python standard.

**Recommendation**: ADOPT Oxlint as a secondary fast-path lint (≤1s on full repo); keep ESLint as primary until Oxlint custom-rule support is mature. DEFER Biome until v3 (which is expected to ship a custom-rule API).

### B6. GitHub Actions

**Current state**: Pinned-by-SHA in some places; permissions block read-only default; OIDC for wrangler-action.

**New since baseline**:
- **Artifact Attestations** (Sigstore-backed) — generally available; one-line `actions/attest` step.
- **Workflow execution controls** (rulesets-based) — restrict who/what can trigger.
- **Action policy with explicit blocking** (`!action@v1`) and SHA pinning enforcement.
- **2026 secure defaults**: read-only GITHUB_TOKEN in new repos; mandatory action review for first-time contributors.

**Recommendation**: ADOPT Artifact Attestations on every release workflow (already partially via Wave 2 #912 SLSA work). ADOPT execution controls for governance workflows (label-lint, evidence-completeness) so only operator can dispatch.

### B7. RAG / Wiki tooling

**Current state**: Karpathy LLM Wiki pattern at `wiki/`. 108 files; 25 concepts; 68 sources; 6 syntheses; 52 log entries (26 in May 2026 alone).

**New since baseline (April 2026)**:
- **Karpathy gist (5,000 stars first week)** — formalizes the 3-layer pattern:
  1. Knowledge compilation: LLM reads doc, extracts, integrates into wiki.
  2. Structured organization: source summaries + topic pages + saved answers.
  3. Query mechanism: index-first lookup, no similarity search by default; vector search only when wiki outgrows context (200K+ tokens).

**Recommendation**: ADOPT 3-layer formalization (currently 2-layer: sources + concepts; missing the "saved answers" layer). ADD `wiki/answers/` directory with frontmatter `question` + linked source/concept pages. Add `npm run wiki:answer` skill that, given a question, either returns existing answer or compiles a new one.

### B8. Sigstore / SLSA

**Current state**: Wave 2 child 6 (#912) shipped SLSA-L3 + Cosign Bundle 1.0 + OIDC publishing. KV `slsa-attest:<sha>` markers consumed by `/mcp` (#927).

**New since baseline**:
- **slsa-verifier**: standalone verifier for provenance.
- **GitHub Artifact Attestations** subsumes much of cosign for GitHub-native workflows.
- **Container Generator GA for SLSA L3**.

**Recommendation**: KEEP existing cosign-bundle path for cross-platform; ADD GitHub Artifact Attestations as a parallel signal for GitHub-native consumers.

## Section C — Recommended dev children

Numbered list with effort + dep order. Filed when R&D closes.

| # | Title | Effort | Owner | Depends-on |
|---|---|---|---|---|
| C1 | Fix R9.2 hook `--delete` over-restriction (A1) | 0.25d | Claude Code | none |
| C2 | Reduce evidence-completeness 60s race + auto-guidance comment (A2) | 0.5d | Codex | none |
| C3 | Allow `Refs Epic + Refs #child` pairing (A3) | 0.25d | Codex | none |
| C4 | Wiki LLM ingest deterministic fallback (A7) | 0.5d | Claude Code | none |
| C5 | Magic-number lint whitelist `#\d{2,4}` literals (A6) | 0.25d | Claude Code | none |
| C6 | Readability gate baseline-tracking (A9) | 1d | Claude Code | none |
| C7 | Vale step retry-with-backoff (A5) | 0.25d | Codex | none |
| C8 | Workers Observability v2 adoption (B1) | 1d | Claude Code | none |
| C9 | Anthropic extended-cache-ttl explicit opt-in per call (B2) | 0.5d | Claude Code | none |
| C10 | `cacheHeaders('openai'\|'gemini')` no-op simplification (B3) | 0.25d | Claude Code | none |
| C11 | Gemini 2.5 Pro added to sticky-route premium tier (B3) | 0.25d | Claude Code | none |
| C12 | Oxlint secondary-lane lint adoption (B5) | 1d | Codex | none |
| C13 | GitHub Artifact Attestations on release workflow (B6, B8) | 1d | Codex | none |
| C14 | Wiki 3-layer evolution: add `wiki/answers/` + `wiki:answer` skill (B7) | 1.5d | Claude Code | none |
| C15 | LiteLLM sidecar architecture for OpenClaw lane (B4) | 1d | Copilot | none |

15 candidates; 9 of them ≤ 0.5d each. Total estimated: ~9.5d if 1 engineer; ~3 days parallelized across 3 teams.

## Section D — Karpathy LLM Wiki retrospective

### How was the wiki used during Waves 1-8?

The wiki at `wiki/` is the Karpathy 3-layer (sources / concepts / log) implementation. Empirical usage during HAMR Waves 1-8:

- **Sources written**: 68 total. ~30 of those were authored or ingested during May 2026 (Waves 1-8 active period).
- **Concepts written**: 25 total. **10 directly from HAMR work**: `hamr-core-worker`, `hamr-doctor`, `cache-adapters`, `header-spillover`, `substrate-health`, `mailbox`, `judge-quorum`, `baton-signing`, `baton-protocol`, `constitution-compressor`. Each concept page is wikilink-cross-referenced to relevant sources.
- **Log entries**: 52 total; 26 in May 2026.
- **Cross-referencing**: every HAMR PR's CHANGELOG entry includes wiki concept links (e.g., `wiki/concepts/cache-adapters.md` referenced from #926 CHANGELOG).

### Specific evolutions during Waves 1-8

1. **HAMR concept cluster** created from scratch — 10 concept pages establishing a self-referencing knowledge graph (wikilinks resolve cleanly between concepts).
2. **Convergence Design v1** (#922) ingested as a wiki source page (`wiki/sources/harness-convergence-design-2026-05-05.md`) cross-referencing 5 concepts.
3. **Wave-research artifacts** (S1-S6 spike research, v3.2/v3.2.1/v3.2.2 redesigns) all ingested with TLDR + entity links.
4. **Log discipline**: each wave's research/validation/convergence event recorded with `[YYYY-MM-DD] <op> | <subject>` prefix for CLI filtering.

### Where the wiki was helpful

| Workflow | Wiki contribution | Without wiki, instead |
|---|---|---|
| HAMR v3.2.2 patch authoring | `wiki/concepts/baton-signing.md` + `header-spillover.md` cross-links provided full context in 2 reads | Would have required re-reading 3 source PRs end-to-end |
| Convergence-design Round 3 (Claude Code Team voice) | `wiki/concepts/cache-adapters.md` + `substrate-health.md` provided prior-art summary | Manual summary from PR diffs |
| Wave 8 child #976 cascade-policy-overrides design | `wiki/concepts/header-spillover.md` direct read replaced re-implementation analysis | Would have re-read `header-spillover.js` source |
| Wave 8 child #979 SKILL.md derive | wiki/concepts pages provided pattern for "what is canonical" decision | Speculative |

### Where the wiki was NOT consulted (gaps)

1. **Defect audit (Section A above)** — wiki has no `wiki/concepts/known-defects.md` page. Defects were tracked across CHANGELOG + PR comments. Recommendation: add a defects concept synthesis.
2. **Ecosystem-evolution survey (Section B)** — wiki had no upstream-ecosystem page; all of Section B is fresh websearch. Recommendation: add `wiki/syntheses/ecosystem-state-{quarter}.md` synthesis pages tracking upstream evolution.
3. **Tooling skills (35 skills enumerated by #979)** — wiki does not currently mirror skill descriptions. SKILL.md frontmatter could be ingested. Recommendation: deferred to follow-up; SKILL.md derive (#979) already produces a per-team view.
4. **Per-team config markers (#963 / #978)** — wiki has no concept page on team-state model. Recommendation: add `wiki/concepts/per-team-state.md`.
5. **3rd layer of Karpathy pattern: saved answers** — entirely missing. See C14 recommendation.

### Wiki evolution recommendations (consolidated)

1. **Add `wiki/answers/` 3rd layer** (C14) — implements full Karpathy pattern.
2. **Add `wiki/concepts/known-defects.md`** — formalize defect tracking.
3. **Add `wiki/syntheses/ecosystem-state-2026-Q2.md`** — capture this survey's findings as wiki content.
4. **Add `wiki/concepts/per-team-state.md`** — formalize axis_consumers + hamr-config markers.
5. **Wiki LLM-ingest deterministic fallback** (C4) — never block ingest on fleet outage.

## Sources

- [Configuration · Cloudflare Workers docs](https://developers.cloudflare.com/workers/wrangler/configuration/)
- [Introducing Workers Observability — Cloudflare blog](https://blog.cloudflare.com/introducing-workers-observability-logs-metrics-and-queries-all-in-one-place/)
- [Durable Objects in Dynamic Workers — Cloudflare blog](https://blog.cloudflare.com/durable-object-facets-dynamic-workers/)
- [Anthropic Prompt Caching docs](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
- [Anthropic API Pricing 2026 — Finout](https://www.finout.io/blog/anthropic-api-pricing)
- [Anthropic Cache TTL Cut 2026 — Fetchlogic](https://fetchlogic.net/anthropics-silent-cache-cut-what-the-ttl-downgrade-reveals-about-the-real-cost-of-api-dependence/)
- [LiteLLM Routing & Load Balancing](https://docs.litellm.ai/docs/routing-load-balancing)
- [LLM Gateway Comparison 2026 — RelayPlane](https://relayplane.com/blog/llm-gateway-comparison-2026)
- [Biome vs ESLint vs Oxlint 2026 — PkgPulse](https://www.pkgpulse.com/guides/biome-vs-eslint-vs-oxlint-2026)
- [GitHub Actions 2026 Security Roadmap](https://blog.canadianwebhosting.com/github-actions-2026-security-roadmap-5-features-that-will-change-how-you-ship-code/)
- [GitHub Artifact Attestations docs](https://docs.github.com/en/actions/concepts/security/artifact-attestations)
- [Karpathy LLM Wiki gist](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)
- [Karpathy LLM Wiki — VentureBeat](https://venturebeat.com/data/karpathy-shares-llm-knowledge-base-architecture-that-bypasses-rag-with-an)
- [LLM Wiki: Karpathy's 3-Layer Pattern](https://decodethefuture.org/en/llm-wiki-karpathy-pattern/)
- [Sigstore cosign GitHub repo](https://github.com/sigstore/cosign)
- [SLSA 3 Compliance with GitHub Actions — GitHub blog](https://github.blog/security/supply-chain-security/slsa-3-compliance-with-github-actions/)
- [LLM API Pricing 2026 — Morphllm](https://www.morphllm.com/llm-api)
- [Playwright MCP docs](https://playwright.dev/docs/getting-started-mcp)
- [Playwright MCP AI Testing 2026 — Bug0](https://bug0.com/blog/playwright-mcp-changes-ai-testing-2026)
