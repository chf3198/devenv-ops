---
title: HAMR Spike S1 — Existing Code Audit
date: 2026-05-04
ticket: 876
epic: 860
status: research-deliverable
---

# HAMR Spike S1 — Existing Code Audit

## 1. Summary

Audit of 20 modules against the 13-child HAMR v3 MVP plan. The harness already
implements meaningful portions of substrate probing, fleet routing, provider
adapters, wiki management, and CF Worker coordination. Six HAMR children
overlap directly with existing code. Net assessment: 3 REUSE, 11 REFACTOR,
3 REPLACE, 3 MERGE (across 16 scoped modules plus 4 additional modules
discovered in scope). The revised HAMR child list reduces from 13 to 9 by
absorbing 4 children into refactored existing modules.

Decision counts: REUSE 3, REFACTOR 11, REPLACE 3, MERGE 3.
Revised child count: 9 (down from 13).

### 1.1 Note on issue references inside this audit

References like `(#866)`, `(#868)`, `(#869)`, `(#870)`, `(#871)`, `(#876)`, and
`(#877)` in the per-module decision matrix and decision details below are
**placeholder labels** that map to prospective HAMR MVP children. Those children
have **not yet been filed** — they will be created after all six HAMR validation
spikes (#876 S1, #877 S2, #878 S3, #879 S4, #880 S5, #881 S6) close green and
the gate review approves MVP execution. The numeric labels coincidentally
collide with unrelated open issues in the Karpathy Wiki epic (#866) and with
the active S1 / S2 spike issues themselves; treat every `(#NNN)` reference
inside §3–§5 as a **functional name**, not a live GitHub link, until the MVP
children are filed and a follow-up update remaps them.

Mapping table (placeholder → prospective HAMR child scope):

| Placeholder | Prospective HAMR child scope |
|---|---|
| `(#866)` | HAMR core Cloudflare Worker (`/bundle`, `/mcp`, `/mailbox`, `/quota`, `/healthz`) |
| `(#868)` | Provider caching adapters + sticky-route + cache-hit-rate gate |
| `(#869)` | JIT wiki retrieval (MCP `resources/read`) + bidirectional ingest |
| `(#870)` | Substrate-health probe + `~/.megingjord/substrate-health.json` |
| `(#871)` | R2 JSONL mailbox + Google A2A envelope |
| `(#876)` | Header-driven rate-limit spillover + Anthropic Batch router |
| `(#877)` | `hamr:status` + `hamr:quota` operator-UX CLIs |

## 2. Methodology

### Files read

Primary audit scope (as specified):

- `scripts/global/cascade-dispatch.js` (100 lines)
- `scripts/global/free-router.js` (84 lines)
- `scripts/global/state-offload-client.js` (97 lines)
- `scripts/global/agent-coord-remote.js` (98 lines)
- `scripts/global/capability-probe.js` (92 lines)
- `scripts/global/capability-show.js` (66 lines)
- `scripts/global/routing-refresh.js` (89 lines)
- `scripts/global/matrix-freshness.js` (47 lines)
- `scripts/global/rag-search.js` (74 lines)
- `scripts/global/agent-signature.js` (42 lines)
- `scripts/wiki/ingest.js` (88 lines)
- `scripts/wiki/lint.js` (98 lines)
- `scripts/wiki/anneal.js` (99 lines)
- `scripts/wiki/search.js` (76 lines)
- `cloudflare/worker.ts` (24 lines)
- `cloudflare/durable-object.ts` (70 lines)

Additional modules discovered during audit that intersect HAMR scope:

- `scripts/global/litellm-client.js` (69 lines)
- `scripts/global/token-provider-adapters.js` (78 lines)
- `scripts/global/fleet-config.js` (66 lines)
- `scripts/global/model-routing-engine.js` (54 lines)

Reference documents read: `research/hamr-v3-2026-05-04.md`,
`research/fleet-harness-awareness-v2-2026-05-04.md`,
`research/fleet-harness-awareness-2026-05-04.md`.

### Scope boundary

In scope: modules that implement routing, fleet probing, provider interaction,
wiki management, CF coordination, or agent identity — the functional areas
HAMR v3 claims. Out of scope: governance/baton tooling, ticket scripts,
dashboard UI, cost-telemetry accounting, and CI scripts, unless they directly
touch a HAMR surface.

### Decision rubric

| Decision | Criteria |
|---|---|
| REUSE | Current behavior satisfies the HAMR requirement as-is; no modification needed |
| REFACTOR | Core logic is reusable; HAMR requires extension, new config surface, or integration wiring |
| REPLACE | Module's design is incompatible with HAMR; deprecate and delete after HAMR ships the replacement |
| MERGE | Two or more existing modules have overlapping responsibility; collapse into a single HAMR module |

## 3. Per-Module Decision Matrix

| Module | Lines | Current Purpose | HAMR Touch Points | Decision | Rationale |
|---|---|---|---|---|---|
| `cascade-dispatch.js` | 100 | Ollama → heuristic → judge gate → escalation signal | Header-driven spillover (#876); per-tier sub-bundle selection; cascade is core HAMR dispatch path | REFACTOR | Engine is correct; needs header-RL read layer and profile-aware model selection added |
| `free-router.js` | 84 | Signal-classifier + optional Groq LLM tier selection | Free-tier-first mandate; `hamr:quota` provider detection | MERGE | Capability detection logic merges into `capability-probe`; tier classification merges into `model-routing-engine` |
| `state-offload-client.js` | 97 | CF Worker cache reads; gh CLI fallback for baton/assignee/branch/activity | CF Worker substrate in HAMR core (#866); substrate-health fallback chain (#870) | REFACTOR | Worker URL resolution and fallback pattern are directly reusable; needs DPoP auth header injection and `substrate-health.json` read integration |
| `agent-coord-remote.js` | 98 | Lease/heartbeat/agent-list via Worker or local SQLite | HAMR mailbox (#871) overlaps lease + agent-registry; Worker auth upgrade | REPLACE | Durable Object coordination is being superseded by R2 JSONL mailbox + KV; lease model has no analogue in HAMR A2A design |
| `capability-probe.js` | 92 | Provider HTTP probes + Tailscale + fleet probe; writes `capabilities.json` | Substrate-health probe (#870); basis for `hamr:status` and `hamr:quota` | REFACTOR | Probe surface is exactly what #870 requires; add `substrate-health.json` write path, DPoP-bound CF Worker probe, and rate-limit header capture |
| `capability-show.js` | 66 | Pretty-prints `capabilities.json` tier availability | `hamr:status` CLI output (#877) | MERGE | Rendering logic folds into the new `hamr:status` command in `#877`; standalone show is redundant once status CLI exists |
| `routing-refresh.js` | 89 | Fleet + cloud model probe; writes `routing-snapshot.json`; stamps matrix header | Substrate health (#870); provider model enumeration for sticky-cache routing (#868) | REFACTOR | Multi-provider probe is directly reusable; needs convergence with `capability-probe` output and removal of matrix-stamping side-effect |
| `matrix-freshness.js` | 47 | Fails CI when `LLM-EVALUATION-MATRIX.md` refresh header is stale | No direct HAMR function; staleness gate belongs in CI, not HAMR runtime | REUSE | Purely a CI gate on a research artifact; HAMR does not touch the matrix file |
| `rag-search.js` | 74 | MCP RAG search with ripgrep fallback; top-k snippet retrieval | JIT wiki retrieval (#869); `resources/read` dereference | REFACTOR | Fallback pattern (remote → local) is the right shape; MCP endpoint needs to target HAMR Worker `/wiki` resource, not legacy RAG server URL |
| `agent-signature.js` | 42 | Resolves alias + role surname from `team-model-signatures.json` | Capability manifest signing; A2A envelope `from.alias` field; bundle provenance | REUSE | No changes needed; HAMR consumes existing output format in mailbox envelopes and governance artifacts |
| `wiki/ingest.js` | 88 | LLM-assisted source ingestion → `wiki/sources/*.md` + index + log | Wiki bidirectional sync (#869); `wiki:ingest --auto` driver | REFACTOR | Core pipeline is correct; add R2 queue source path, `--auto` flag for CI-driven ingest, and TruffleHog pre-write scan |
| `wiki/lint.js` | 98 | Broken wikilinks, orphans, frontmatter, index-sync checks | Wiki health gate for JIT index (#869); bundle schema validation gate | REUSE | Structural checks are complete and stable; no HAMR changes needed |
| `wiki/anneal.js` | 99 | Dry-run + apply fixes for broken links, orphans, frontmatter | Nightly Anthropic Batch anneal job (#876 batch router) | REFACTOR | Anneal logic is correct; needs `--batch` mode flag to emit a batch-API request list rather than executing live LLM calls |
| `wiki/search.js` | 76 | Keyword-scored page match + LLM synthesis answer | JIT wiki retrieval (#869); index-first query path | MERGE | Keyword scoring + LLM synthesis folded into `rag-search.js` refactor; separate standalone is redundant once `rag-search` targets HAMR Worker |
| `cloudflare/worker.ts` | 24 | CF Worker entry; routes to per-fleet Durable Object | HAMR core Worker (#866); bundle/MCP/mailbox/quota endpoints | REPLACE | Current worker only handles lease coordination; HAMR core requires a full router: `/bundle`, `/mcp`, `/mailbox`, `/quota`, `/healthz`. The new worker replaces rather than extends this file. |
| `cloudflare/durable-object.ts` | 70 | Per-fleet lease + heartbeat + agent-list in Durable Object storage | HAMR mailbox (#871) considered using DO; v3 chose R2 JSONL + KV | REPLACE | DO is the wrong substrate for mailbox (v3 chose R2 JSONL); and lease coordination has no HAMR equivalent. Both replaced by new R2-backed design. |
| `litellm-client.js` | 69 | LiteLLM gateway → direct Ollama fallback; named route groups | Cascade dispatch fleet path; provider caching adapters (#868) | REFACTOR | Named group routing is reusable; needs per-tier profile selection (fim-5kb → fleet-primary) and rate-limit header passthrough |
| `token-provider-adapters.js` | 78 | Parse `usage` payloads from Anthropic/OpenRouter/LiteLLM/Gemini/Ollama/Copilot | Cache-read token measurement for ≥80% hit-rate gate (#868); `hamr:quota` reporting | REFACTOR | Adapter coverage is correct; add `cache_read_tokens` extraction for Gemini `cachedContentTokenCount` and Groq header-based counting |
| `fleet-config.js` | 66 | Tailscale peer resolution; fleet device inventory; `getProfile()` solo/degraded/full | Substrate-health probe (#870); embedded-floor degraded mode detection | REFACTOR | `getProfile()` is the right abstraction; needs `~/.megingjord/substrate-health.json` as write target instead of implicit return only |
| `model-routing-engine.js` | 54 | Policy-based lane resolution with rollback gate and complexity threshold | Header-driven spillover (#876); token-budget-per-task enforcement | REFACTOR | Rollback gate and complexity threshold are directly reusable; add rate-limit header input path and per-role budget check |

## 4. Decision Details

### `cascade-dispatch.js` — REFACTOR

Current behavior: Ollama health check → heuristic quality gate → optional judge
gate → escalation signal with `suggested_tier` [`:L1-L79`]. Callers in the
hook layer read `escalation_needed` and `suggested_tier` to decide whether to
pay for a cloud tier.

HAMR needs: header-driven spillover (`remaining < 10%` OR `reset > task budget`)
from HAMR v3 §4 [hamr-v3:L79-L84]; per-tier sub-bundle profile selection so the
dispatched model aligns with the bundle it receives (fim-5kb → qwen2.5-coder,
coder-15kb → Haiku, etc.) [hamr-v3:L53-L62].

Recommended action: Add a `spillover` layer before the Ollama path that reads
rate-limit headers from `substrate-health.json` and selects provider accordingly.
Inject `profile` parameter so callers can constrain the model set. Keep existing
heuristic + judge gate as-is; they remain valid quality filters.

---

### `free-router.js` — MERGE

Current behavior: signal-classifier regex stack picks tier; optional Groq LLM
call validates guess [`:L33-L76`]. Reads `capabilities.json` to detect free-LLM
availability [`:L23-L30`].

HAMR needs: the capability-detection logic (`_hasFreeLLM`) is a subset of
`capability-probe`'s provider probing. The tier-classification signals
(`SIGNAL_FIM`, `SIGNAL_REFACTOR`, etc.) are a weaker version of
`model-routing-engine`'s `classifyTask`.

Recommended action: Merge `_capability` / `_hasFreeLLM` into `capability-probe`
output (already present there). Merge `classify` into `model-routing-engine`
`classifyTask` as a keyword-weight extension. Delete `free-router.js` after
migration. No behavioral loss — `model-routing-engine` already handles the
same cases with a richer policy JSON.

---

### `state-offload-client.js` — REFACTOR

Current behavior: reads baton state, assignee, branch, and recent activity from
CF Worker cache (GET) with `gh` CLI fallback [`:L51-L85`]. Worker URL from
`CLOUDFLARE_WORKER_URL` env or `capabilities.json` [`:L26-L30`].

HAMR needs: Worker URL moves to `~/.megingjord/substrate-health.json`; auth
changes from unauthenticated GET to DPoP-bound Bearer JWT [hamr-v3:L12];
`substrate-health.json` read replaces `capabilities.json` read for worker
availability.

Recommended action: Swap `_workerUrl()` to read `substrate-health.json`;
add DPoP auth header injection using identity module output. Existing fallback
chain (Worker → gh CLI → local file) matches HAMR v2/v3 degraded-mode design
and requires no structural change.

---

### `agent-coord-remote.js` — REPLACE

Current behavior: lease acquire/release, heartbeat, and agent-list via CF Worker
(Durable Object) or local SQLite fallback [`:L48-L85`]. Wire protocol is bare
HTTP POST to `/lease/acquire`, `/lease/release`, `/heartbeat`, `/agents`
[`:L31-L43`].

HAMR needs: v3 mailbox uses R2 JSONL + A2A envelope; per-fleet lease
coordination has no analogue in the HAMR design. The Durable Object substrate
is being replaced.

Recommended action: Mark deprecated once HAMR mailbox (#871) ships. Remove
after a 30-day deprecation window. The client wrapper pattern (remote vs local
fallback) is worth preserving as a design reference for the mailbox client, but
the code itself does not transfer.

---

### `capability-probe.js` — REFACTOR

Current behavior: probes 6 cloud providers + Tailscale + fleet Ollama hosts;
writes `.dashboard/capabilities.json` [`:L68-L87`]. Provider probe set:
Anthropic, OpenAI, Groq, Cerebras, Google AI Studio, OpenRouter [`:L15-L22`].

HAMR needs: #870 substrate-health probe writes `~/.megingjord/substrate-health.json`
with per-provider rate-limit header state (remaining, reset) and CF Worker
reachability. The probe topology is identical; the output schema and write path
differ.

Recommended action: Add write path to `~/.megingjord/substrate-health.json`
(alongside existing `.dashboard/capabilities.json` for backward compat). Extend
provider probe result to include last-seen rate-limit headers. Add CF Worker
probe with DPoP auth. Convergence with `routing-refresh.js` probe set avoids
duplicate network calls — see that entry.

---

### `capability-show.js` — MERGE

Current behavior: loads `capabilities.json` and prints tier availability table
[`:L38-L52`]. Tier labels reference Phase 0–4 architecture (now superseded).

HAMR needs: `hamr:status` CLI (#877) supersedes this with structured
single-line output plus machine-readable JSON [hamr-v3:L37-L39].

Recommended action: Extract `tierAvailability()` function as input to the
`hamr:status` renderer. Delete `capability-show.js` as a standalone command
once `hamr:status` ships. Tier labels need to be updated to HAMR substrate
naming regardless.

---

### `routing-refresh.js` — REFACTOR

Current behavior: probes Groq, Cerebras, OpenRouter, Google, and three Ollama
fleet hosts by Tailscale IP [`:L51-L59`]; writes `.dashboard/routing-snapshot.json`;
optionally stamps the LLM evaluation matrix header [`:L66-L73`].

HAMR needs: provider model enumeration feeds sticky-cache routing (#868) so the
same `bundle_sha256` routes to the same workspace. Matrix-stamping is a
research-artifact concern, not a runtime concern.

Recommended action: Extract the probe loop into a shared utility consumed by
both `routing-refresh` and `capability-probe` (eliminating duplicate network
calls). Remove `stampMatrixHeader` from the runtime path — it belongs in a
separate maintenance script. Update write path to emit into
`substrate-health.json` model-list field.

---

### `matrix-freshness.js` — REUSE

Current behavior: parses `**Last refreshed:**` header from the LLM evaluation
matrix markdown; fails CI if age exceeds threshold [`:L21-L34`].

HAMR needs: none. This is a CI gate on a research artifact in
`research/model-compare/`. HAMR does not own or modify that file.

No changes required. Keep as-is.

---

### `rag-search.js` — REFACTOR

Current behavior: MCP RAG endpoint (HTTP GET) with ripgrep fallback; returns
top-k snippets with path + line numbers [`:L57-L66`]. MCP URL from
`capabilities.json` `mcp.rag_server` field [`:L19-L23`].

HAMR needs: JIT wiki retrieval (#869) fetches page body via `resources/read`
against the HAMR Worker `/wiki/<slug>` endpoint, not a dedicated RAG server.
The MCP-first → local-fallback pattern is directly applicable.

Recommended action: Parameterize `_ragUrl()` to accept a HAMR Worker base URL
from `substrate-health.json`. Add a `resources/read` call path for structured
wiki page retrieval. Ripgrep fallback stays for offline mode. The top-k scoring
in `wiki/search.js` is a better fit for keyword search; consolidate there.

---

### `agent-signature.js` — REUSE

Current behavior: resolves `signedBy` alias from team + model + role via
`team-model-signatures.json` registry [`:L12-L34`]. Outputs text or JSON.

HAMR needs: A2A envelope `from.alias` [fleet-harness-v2:L136-L138]; Cosign
bundle `Signed-by:` trailer; capability manifest provenance. All of these
consume the existing output format unchanged.

No changes required. Downstream consumers (mailbox, bundle signing) call this
module as-is.

---

### `wiki/ingest.js` — REFACTOR

Current behavior: reads raw source, calls LLM for extraction, writes
`wiki/sources/<slug>.md`, updates index and log, marks source as ingested
[`:L13-L51`]. LLM routing: OpenClaw → Groq → Cerebras.

HAMR needs: `wiki:ingest --auto` driver for GitHub App PR merge path (#869);
TruffleHog `--only-verified` scan before R2 queue write [hamr-v3:L19]; Anthropic
Batch mode for nightly runs [hamr-v3:L75].

Recommended action: Add `--auto` flag that reads from R2 queue JSON instead of
a local file path. Add `--batch` flag to emit a batch API request body. Insert
TruffleHog subprocess call before the R2 write step. Core LLM extraction
pipeline requires no changes.

---

### `wiki/lint.js` — REUSE

Current behavior: full structural health check — broken wikilinks, orphans,
missing frontmatter, index sync [`:L23-L69`]. Pure filesystem, no LLM calls.

HAMR needs: wiki index health gate before JIT index bundle (#869); the JIT
index (`[[wikilink]]→uri` mapping) is derived from a passing lint run.

No changes required. Run as a pre-bundle gate; the existing exit-code contract
(0 = pass, 1 = issues) is machine-readable.

---

### `wiki/anneal.js` — REFACTOR

Current behavior: fuzzy-match broken links, fix orphans in index, prepend
missing frontmatter; dry-run by default, `--apply` to write [`:L83-L99`].

HAMR needs: nightly Anthropic Batch anneal job [hamr-v3:L75]; background mode
for CRDT merge [hamr-v3:L78]. Current anneal is synchronous and local.

Recommended action: Add `--batch` flag that collects all fix candidates and
emits an Anthropic Batch API request list (JSON lines) instead of executing
LLM calls live. Existing `--apply` mode stays for manual runs. No structural
changes to fix logic needed.

---

### `wiki/search.js` — MERGE

Current behavior: keyword-scores all wiki pages against the query, selects top-5,
builds context string, calls LLM for synthesis [`:L25-L53`]. Degrades gracefully
when LLM is unavailable by printing raw page snippets [`:L56-L63`].

HAMR needs: JIT wiki retrieval (#869) retrieves individual page bodies via
`resources/read`. The keyword scoring layer in `wiki/search.js` duplicates
logic in `rag-search.js`. Both target the same use case (find relevant wiki
content) via different entry points.

Recommended action: Merge the keyword-scoring function into `rag-search.js` as
a local-index fallback when the HAMR Worker endpoint is unavailable. The
LLM-synthesis step (via `wiki-llm.js`) folds into a caller option on the merged
module. Delete `wiki/search.js` as a standalone after migration.

---

### `cloudflare/worker.ts` — REPLACE

Current behavior: thin entry that routes all requests to a per-fleet Durable
Object [`:L12-L24`]. Only endpoint is `/healthz` plus DO passthrough. Auth is
absent.

HAMR needs: full HAMR core Worker (#866) with routes `/bundle/<profile>/<sha>`,
`/bundle/diff/<a>/<b>`, `/mcp` (OAuth 2.1 + DPoP), `/mailbox`, `/quota`,
`/healthz` [hamr-v3:L100-L130]. SLSA L3 + OIDC publishing day-one.

Recommended action: Replace entirely. The new Worker is a net-new TypeScript
module in a dedicated workspace (`cloud/worker/` per hamr-v3 §5). This file's
sole reusable pattern is the `fleetId` routing logic (3 lines); document as
prior art in the new Worker's README.

---

### `cloudflare/durable-object.ts` — REPLACE

Current behavior: per-fleet lease + heartbeat + agent-list backed by DO storage
[`:L30-L69`]. API mirrors `agent-coord-local.js`.

HAMR needs: mailbox (#871) uses R2 JSONL + A2A envelope; lease coordination
has no HAMR equivalent. The Durable Object substrate is not used in HAMR v3.

Recommended action: Replace alongside `worker.ts`. IF HAMR later needs
cross-request state (rate-limit counter, cache-name registry), a new DO can be
introduced; do not retrofit this one.

---

### `litellm-client.js` — REFACTOR

Current behavior: LiteLLM gateway (named route groups) → direct Ollama fallback
[`:L48-L56`]. Named groups: `fleet-primary`, `fleet-fast`, `fleet-quality`,
`fleet-fallback` [`:L12-L16`].

HAMR needs: per-tier profile selection maps named groups to sub-bundle profiles
(fim-5kb → fleet-primary; coder-15kb → fleet-quality) [hamr-v3:L53-L62];
rate-limit header passthrough from LiteLLM response needed for spillover.

Recommended action: Add `profile` parameter that selects named group from a
profile→group map. Add header capture from LiteLLM response for rate-limit
state. No structural change to fallback logic.

---

### `token-provider-adapters.js` — REFACTOR

Current behavior: normalizes `usage` payload from 6 providers into a canonical
token record [`:L12-L78`]. Captures `cache_read_tokens` for Anthropic
(`cache_read_input_tokens`) [`:L19`] and Gemini (`cachedContentTokenCount`)
[`:L51`].

HAMR needs: ≥80% cache hit-rate gate (#868) requires `cache_read_tokens`
extraction for all cached providers; `hamr:quota` reporting aggregates across
providers [hamr-v3:L87]. Groq has no caching, but does expose rate-limit headers
that need capture.

Recommended action: Add Groq header-based rate-limit adapter (not a token
adapter — a separate header-capture function). Verify Gemini `cachedContentTokenCount`
path handles the `cachedContents` resource model from v3. Add `cache_hit_rate`
computed field to summary output.

---

### `fleet-config.js` — REFACTOR

Current behavior: resolves fleet device IPs via Tailscale, returns
`getProfile()` = `{mode: solo|degraded|full, fleet}` [`:L40-L46`].

HAMR needs: `getProfile()` output is the basis for `hamr warn substrate=embedded-floor`
fallback banner [hamr-v3:L41-L45]; `substrate-health.json` should be written on
profile resolution so other tools share the result without re-probing.

Recommended action: Write `substrate-health.json` from `getProfile()` (atomic
write to `~/.megingjord/substrate-health.json`). Add CF Worker reachability
field. Keep existing return value for backward compatibility.

---

### `model-routing-engine.js` — REFACTOR

Current behavior: resolves routing from prompt + route struct; applies rollback
gate and complexity threshold [`:L36-L52`]. Reads `model-routing-policy.json`.

HAMR needs: token-budget-per-task enforcement (Manager 4K, Collaborator 30K,
Admin 6K, Consultant 8K) [hamr-v3:L85]; rate-limit header input path for
spillover ordering [hamr-v3:L79-L84].

Recommended action: Add `budgetTokens` parameter to `resolveRouting`; emit
error when handoff budget field is exceeded. Add `rateLimitState` input (from
`substrate-health.json`) used when selecting between spillover providers.
Existing rollback gate and complexity threshold are unchanged.

---

## 5. Identified Duplications

The following HAMR v3 child tickets substantially duplicate logic that already
exists in audited modules. In each case the existing module covers the core
behavior and requires extension (REFACTOR) rather than a new build.

| HAMR v3 Child | Existing Module(s) | Overlap |
|---|---|---|
| #870 Substrate health probe | `capability-probe.js`, `routing-refresh.js`, `fleet-config.js` | All three probe providers and fleet; differ only in output path and schema |
| #868 Provider caching adapters + sticky-route | `token-provider-adapters.js`, `litellm-client.js` | Cache token extraction and named-group routing already implemented for 6 providers |
| #877 Operator UX (`hamr:status`) | `capability-show.js` | Tier availability rendering is already implemented; needs rename + HAMR schema |
| #876 Rate-limit spillover + batch router | `model-routing-engine.js`, `cascade-dispatch.js` | Lane resolution + escalation signal logic is the core of spillover; batch mode is additive |

## 6. Revised HAMR Child List

Four children absorb into existing refactored modules. Nine children survive.

1. **#866 HAMR core Worker** — Net-new. Replaces `cloudflare/worker.ts`. Full
   router: `/bundle`, `/mcp` (OAuth 2.1 + DPoP), `/mailbox`, `/quota`, `/healthz`.
   SLSA L3 + OIDC publish. Blocks #867, #868, #869, #871.

2. **#867 Identity** — Net-new. Device-flow + DPoP key in OS keychain. Produces
   `~/.megingjord/identity.json`. Required by all Worker-authenticated calls.

3. **#864 Embedded floor + per-tier profiles** — Net-new bundler. `prepack`
   script emitting 4 sub-bundle profiles. No existing module covers this.

4. **#874 Distilled constitution pipeline** — Net-new. Offline LLM compress +
   100-prompt rule-coverage gate. No existing module covers this.

5. **#869 Wiki bidirectional + JIT retrieval** — Extends `wiki/ingest.js`
   (REFACTOR: `--auto`, `--batch`, TruffleHog gate) and `rag-search.js`
   (REFACTOR: HAMR Worker endpoint, `resources/read` path). R2 queue +
   GitHub App PR driver is net-new wiring.

6. **#870 Substrate health probe** — Refactors `capability-probe.js` +
   `routing-refresh.js` + `fleet-config.js` into a single probe that writes
   `~/.megingjord/substrate-health.json`. No new probe logic required; only
   convergence and schema change.

7. **#871 Mailbox** — Net-new. R2 JSONL + A2A envelope + MCP send/read.
   Replaces `agent-coord-remote.js` and `cloudflare/durable-object.ts`.

8. **#872 Cross-repo tool federation + capability manifests** — Net-new. Tool
   allowlist per MCP surface; `~/.megingjord/mcp.json` union registry. No
   existing module covers this.

9. **#878 SLSA + OIDC publishing pipeline** — Net-new CI workflow. Blocks #866
   deployment. No existing module covers this.

Children removed from the baseline 13 (absorbed into refactors above):

- **#865 Release-asset CDN mirror** — Merged into #864 bundler scope (one
  `prepack` script handles both embedded floor and release-asset upload CI step).
- **#868 Provider caching adapters + sticky-route + context-editing** — Absorbed
  into refactors of `litellm-client.js`, `token-provider-adapters.js`, and
  `model-routing-engine.js` under #870 substrate-health convergence work.
- **#875 Differential bundle endpoint + JSON Patch client** — Absorbed into #866
  HAMR core Worker as a new endpoint; client-side patch application is a small
  addition to the bundle-fetch path in the init CLI.
- **#876 Rate-limit spillover + batch router + quota CLI** — Absorbed into
  refactors of `cascade-dispatch.js` and `model-routing-engine.js`; `hamr:quota`
  CLI output is part of #877 operator UX.

## 7. Wiki Ingest Plan

Slug: `hamr-spike-s1-code-audit`

Candidate entity pages:

- `hamr-core-worker` — entity: the CF Worker that is the HAMR substrate center
- `substrate-health-json` — concept: shared runtime file written by probe,
  consumed by routing, identity, and status CLI
- `cascade-dispatch` — entity: existing fleet dispatch engine (mark as REFACTOR
  target)
- `capability-probe` — entity: existing provider probe (mark as REFACTOR target)
- `wiki-ingest-pipeline` — concept: raw article → LLM extraction → sources page
  → index (covers both current behavior and HAMR bidirectional extension)

Candidate concept pages:

- `per-tier-sub-bundles` — concept: fim-5kb / coder-15kb / reasoner-30kb /
  governance-12kb profiles and how they map to dispatch lanes
- `header-driven-spillover` — concept: rate-limit header read → provider
  selection order (Groq → Cerebras → OpenRouter free → Gemini Flash → Haiku)
- `jit-wiki-retrieval` — concept: index-only bundle + `resources/read` on
  dereference vs full-body bundle

Ingest command after document is accepted:

```bash
npm run wiki:ingest -- research/hamr-spike-s1-code-audit-2026-05-04.md
```

---

Refs Epic #860, S1 #876, HAMR v3 #873
