---
title: "Phase-0 R&D: optimal logging for harness + HAMR + LLM consumption"
date: 2026-05-11
parent_epic: 1339
ticket: 1341
author: Orla Harper (claude-code:opus-4-7@anthropic)
phase: R&D (gate)
---

# Phase-0 R&D — Harness + HAMR Logging Optimization

Research basis for Epic #1339. Five threads cover the 14 ACs of the parent Epic.
The client priorities (LLM-consumable logs, live dashboard streaming, animation)
shape Threads 1, 3, and 4 in particular.

## Executive summary

The harness currently has 8 distinct logging surfaces with mixed schema versioning
and inconsistent field naming. Industry has converged on a small set of patterns
in 2025–2026 that map cleanly to our needs:

1. **OpenTelemetry GenAI semantic conventions** (`gen_ai.*` namespace) are the
   emerging standard for LLM observability. We should adopt them for any
   LLM-step logging the harness emits.
2. **Server-Sent Events (SSE)** is the right transport for `*.jsonl` → dashboard
   live-streaming. Bidirectional WebSocket is overkill for one-way data flow.
3. **`requestAnimationFrame` + canvas + `prefers-reduced-motion`** is the canonical
   stack for dashboard live animations at 60 FPS.
4. **Four Golden Signals** (latency, traffic, errors, saturation) map well to
   harness goals G3/G6/G7/G8 but need extension for governance goals (G1, G5, G9).
5. **Pattern-based redaction at the instrumentation layer** is the right
   PII/secret strategy — prevent rather than scrub.

Recommended Phase-1 deliverables: a single canonical event schema (`events.v3`),
SSE ingestion pipeline, dashboard animation layer (Context Flow + 2 others),
explicit retention/rotation per surface, and a goal-coverage dashboard.

---

## Thread 1 — LLM-consumability of structured logs (AC3 + AC12)

### Key finding

**OpenTelemetry GenAI semantic conventions are the standard.** Major vendors
(Datadog, Grafana Loki) already ingest the `gen_ai.*` namespace natively. As of
2026-03, conventions are experimental but production-adopted via the
`OTEL_SEMCONV_STABILITY_OPT_IN` dual-emission flag.

Core attributes the harness should emit on any LLM-step event:

| Attribute | Notes |
|---|---|
| `gen_ai.system` | provider name (`anthropic`, `openai-compatible`, `ollama`) |
| `gen_ai.request.model` | model id (`claude-opus-4-7`, `qwen2.5:7b`) |
| `gen_ai.usage.input_tokens` | prompt tokens |
| `gen_ai.usage.output_tokens` | completion tokens |
| `gen_ai.operation.name` | `chat`, `tool_use`, `agent_step` |
| `gen_ai.provider.name` | substrate (`anthropic`, `cerebras`, `groq`) |

Multi-agent extensions (agent teams, tasks, memory, artifact tracking) are
actively being developed by the GenAI SIG — relevant for the harness's
Manager/Collaborator/Admin/Consultant baton model.

### Tracing-platform comparison

| Platform | Architecture | Format | Best for |
|---|---|---|---|
| **LangSmith** | SDK wrapper (inside code) | proprietary spans | full execution context; chain/tool visibility |
| **Helicone** | proxy in front of provider | request/response | simplest integration (base URL change); not span-native |
| **Langfuse** | OTel-compatible | OTel spans | open-source self-host; multi-agent ready |
| **Arize Phoenix** | OpenTelemetry-native | OTel spans | framework-agnostic; OSS |
| **OpenLLMetry** | OTel instrumentation | OTel spans | portability — most backends ingest it |

**Recommendation**: emit OpenTelemetry-compatible spans. If we self-host
visualization, **Langfuse** or **Phoenix** are the OSS choices. Helicone is the
simplest but its proxy model doesn't match our internal harness LLM-call paths.

### LLM-readability heuristics

Findings from "Structured Logging That Survives Production" and OneUptime
sanitization guide:

- **Log events, not sentences**. Use stable JSON fields, not template strings.
- **Required field minimum**: `ts`, `level`, `service`, `env`, `event`,
  `trace_id`, plus the thing being acted on.
- **Correlation IDs** on every request/job/message/downstream call.
- **High-precision timestamps** (ms or ns) for correlation across surfaces.

For our LLM-as-consumer paths (anneal pickup, governance audit, Consultant
critique), an optional `summary:` field (≤200 chars) helps prompt-friendly
synthesis without forcing full-content reads. Token-cost benchmark plan in AC3
below.

### Sources (Thread 1)

- [OpenTelemetry GenAI semantic conventions (spec)](https://opentelemetry.io/docs/specs/semconv/gen-ai/)
- [OpenTelemetry for LLMs: SRE Guide 2026 (OpenObserve)](https://openobserve.ai/blog/opentelemetry-for-llms/)
- [Datadog LLM Observability natively supports OpenTelemetry GenAI](https://www.datadoghq.com/blog/llm-otel-semantic-convention/)
- [LLM Observability Guide: Langfuse / Helicone / Portkey / Phoenix](https://python.plainenglish.io/from-black-box-to-crystal-clear-my-hands-on-guide-to-llm-observability-b295e967316f)
- [Helicone vs LangSmith 2026 (Morph)](https://www.morphllm.com/comparisons/helicone-vs-langsmith)
- [Best LLM Observability Tools 2026 (Firecrawl)](https://www.firecrawl.dev/blog/best-llm-observability-tools)
- [Structured Logging That Survives Production (caduh)](https://www.caduh.com/blog/structured-logging-that-survives-production)
- [OpenLLMetry portability note (Spheron blog)](https://www.spheron.network/blog/llm-observability-gpu-cloud-langfuse-arize-phoenix-helicone/)

---

## Thread 2 — Goal-lens mapping methodology (AC2 + AC4)

### Key finding

**Four Golden Signals (Google SRE)** — latency, traffic, errors, saturation —
are the minimal-but-leverageable observability model used industry-wide. They
map cleanly to most operational goals but miss governance-specific axes (G1
governance, G5 portability, G9 interoperability). The harness needs a hybrid.

### Mapping proposal: G1..G9 → signal categories

| Goal | Primary signals | Existing harness surface |
|---|---|---|
| G1 Governance | rule-violation count; baton-handoff completeness; AC-checkbox accuracy | label-rules evaluator output; events.jsonl baton transitions |
| G2 Quality | test-pass rate; consultant-rubric scores; reopen rate | events.jsonl baton:consultant; closeout-lint output |
| G3 Zero Cost | tokens/event; cache-hit-rate; tier-downgrade rate | cache-stats.jsonl; /quota |
| G4 Privacy | secret-scan hits; redaction events; PII-pattern matches | detect-secrets workflow output (not yet in jsonl form) |
| G5 Portability | substrate-mix balance; per-team-substrate failures | incidents.jsonl trigger_role; team-model-signatures |
| G6 Resilience | kill-switch trips; retry rate; pivot-restore success | incidents.jsonl event:kill-switch-trip; pivot-end events |
| G7 Throughput | events/min; baton-lane velocity; queue depth | dashboard panels (snapshot only currently) |
| G8 Observability | log-coverage %; orphan-log %; signal-to-noise ratio | **gap — no current measure** |
| G9 Interoperability | schema-version distribution; reader compatibility errors | **gap — no current measure** |

### Methodology

For each goal, three questions:
1. **What evidence signal proves the goal is met?** (define a measurable SLI)
2. **What surface emits that signal today?** (audit against the inventory)
3. **If no surface emits it, what's the cheapest way to add one?** (lane:
   sensor in `scripts/global/` + jsonl emit + dashboard panel hook)

A goal with **no signal** is a coverage gap. A goal with **multiple uncorrelated
signals** is a consolidation candidate.

### Sources (Thread 2)

- [Four Golden Signals: 2026 Guide (SRE School)](https://sreschool.com/blog/four-golden-signals/)
- [Setting better SLOs using Golden Signals (Gremlin)](https://www.gremlin.com/blog/setting-better-slos-using-googles-golden-signals)
- [SRE Metrics: Four Golden Signals (Splunk)](https://www.splunk.com/en_us/blog/learn/sre-metrics-four-golden-signals-of-monitoring.html)
- [Lessons learned from enterprise SLO management (Dynatrace)](https://www.dynatrace.com/news/blog/lessons-learned-from-enterprise-service-level-objective-management/)

---

## Thread 3 — Live-streaming pipeline (AC13)

### Decision: SSE

**Server-Sent Events wins** for the harness's `*.jsonl` → dashboard live-stream
use case. Rationale:

| Criterion | SSE | WebSocket |
|---|---|---|
| Direction needed | server → client | bi-directional |
| Auto-reconnect | built-in | manual |
| HTTP/2 multiplexing | yes | no |
| Proxy/firewall friendliness | high | medium |
| Browser API stability | HTML5-native | mature |
| Complexity | low | higher |

Industry consensus: **"SSE beats WebSocket for 95% of real-time apps"**
(DEV community); MDN documents SSE as the canonical browser API for one-way
streams. Existing `dashboard/sse-handler.js` in the harness already plumbs SSE
— we extend rather than swap.

### Pipeline architecture

```
[*.jsonl append]
      |
      v
[chokidar file watcher] ── tracks file offset
      |
      v
[tail reader] ──── newline-delimited JSON
      |
      v
[SSE handler] ──── per-client connection
      |
      v
[browser EventSource] ──── EventSource API
      |
      v
[dashboard panel] ──── re-render with new event
```

### Performance + backpressure

- **Throughput cap**: 1000+ events/sec is achievable with chokidar +
  Node.js streams (per "Tailing Logs with Node.js" DEV article).
- **Backpressure**: when consumer can't keep up, sliding-window buffer with
  drop-oldest policy. Emit a `dropped:N` marker so dashboards can render gaps.
- **File rotation aware**: chokidar emits `change` on rotation; tail must
  reset offset and re-tail the new file.

### Latency budget

| Stage | Target |
|---|---|
| File append → chokidar event | <50 ms |
| Tail read + JSON parse | <50 ms |
| SSE serialize + flush | <100 ms |
| EventSource receive | <50 ms |
| DOM re-render (vanilla / no animation) | <100 ms |
| **Total p95** | **<350 ms** |

This satisfies #1339 AC13's <500 ms p95 target.

### Sources (Thread 3)

- [WebSockets vs SSE: Practical Guide (Medium)](https://medium.com/@sulmanahmed135/websockets-vs-server-sent-events-sse-a-practical-guide-for-real-time-data-streaming-in-modern-c57037a5a589)
- [SSE Beats WebSockets for 95% of Real-Time Apps (DEV)](https://dev.to/polliog/server-sent-events-beat-websockets-for-95-of-real-time-apps-heres-why-a4l)
- [Using server-sent events (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events)
- [Tailing Logs with Node.js (DEV)](https://dev.to/logdna/tailing-logs-with-node-js-4h6p)
- [chokidar: cross-platform file watching (GitHub)](https://github.com/paulmillr/chokidar)

---

## Thread 4 — Dashboard animation layer (AC14)

### Decision: requestAnimationFrame + canvas (selective)

Two complementary techniques:

1. **CSS transitions** for simple state changes (bar height, color, fade-in of
   new rows). Cheap, declarative, easy to gate on `prefers-reduced-motion`.
2. **`requestAnimationFrame` + canvas** for high-frequency or complex
   animations (Context Flow panel: 10+ moving sub-nodes).

Real-world reference: a public Next.js dashboard renders **10,000+ data points
at 60 FPS** using canvas + SSE + Web Workers (HirendraKurche/Data-Visualization-
Dashboard on GitHub). Validates the architecture for our scale.

### Accessibility

**`prefers-reduced-motion` is non-negotiable.** Pattern:

```js
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (reduce) {
  // skip animation, snap to new state immediately
} else {
  requestAnimationFrame(animateStep);
}
```

WCAG 4.5:1 contrast continues to apply per `visual-qa-governance.instructions.md`.

### Recommended panels (AC14 candidates)

| Panel | Animation pattern | Stream source |
|---|---|---|
| **Context Flow** | sub-nodes animate position; new connections fade in | `events.jsonl` baton transitions |
| **Anneal queue** (#1316) | rows slide in; tier-counts pulse | `incidents.jsonl` Tier-1/2/3 |
| **Baton flow** | active-role indicator moves between role boxes | `events.jsonl` `baton:*` events |
| **Fleet routing** (P3 #1159) | lane bars width-animate as routing decisions arrive | task-router-dispatch logs |
| **Governance audit** | violation count counter-up animation; new rows highlight | `governance-audit.json` snapshots |

Pick top 3 for Phase-3 implementation; defer rest to follow-up.

### Sources (Thread 4)

- [Window.requestAnimationFrame() (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)
- [Mastering requestAnimationFrame (DEV)](https://dev.to/codewithrajat/mastering-requestanimationframe-create-smooth-high-performance-animations-in-javascript-2hpi)
- [Real-time Dashboard with Canvas + SSE + Web Workers (HirendraKurche)](https://github.com/HirendraKurche/Data-Visualization-Dashboard)
- [Buttery-smooth canvas animation (DEV)](https://dev.to/nidal_tahir_cde5660ddbe04/buttery-smooth-scroll-animations-building-a-high-performance-canvas-parallax-effect-2m8l)

---

## Thread 5 — Retention, rotation, redaction (AC8 + G4 Privacy)

### Retention defaults (proposed)

| Surface | Hot retention | Archive | Rationale |
|---|---|---|---|
| `incidents.jsonl` | 90d | gzip>90d to `~/.megingjord/archive/` | 7d window for anneal sensor; 90d for trend analysis |
| `cache-stats.jsonl` | 30d | drop | only 7d window matters for /quota |
| `dashboard/events.jsonl` | 14d | drop | dashboard panels show recent state |
| HAMR KV state | replace-on-write | n/a | KV is current-state, not log |
| `generated/anneal-sensor.json` | replace-on-write | n/a | snapshot, not log |
| `governance-audit.json` | replace-on-write | n/a | snapshot, not log |
| HAMR Worker logs | 7d (Cloudflare default) | n/a | ops investigation only |

### Rotation mechanism

For append-only `*.jsonl`: size-cap rotation at 50 MB or daily, whichever
first. Use Node.js stream-based rotation OR `logrotate` if running outside Node
runtime. The OneUptime 2026 logrotate guide is the canonical reference.

### PII / secret redaction strategy

**Prevent at instrumentation, not scrub at storage.** The OpenObserve and Dash0
guides converge on this rule.

| Layer | Action |
|---|---|
| Instrumentation site | check field for redaction-pattern match BEFORE write |
| Optional storage processor | second-line defense via regex (OpenTelemetry collector pattern) |
| Pre-LLM-consumption | redact again when log is included in an LLM prompt (high-risk surface) |

Reference pattern: regex against attribute keys AND values; actions are redact,
hash, or drop. OpenObserve ships 144 prebuilt patterns; we can start with a
subset matching our domain (API keys, tokens, email, secret-format strings).

### Required fields for every event

Drawing from "Structured Logging That Survives Production":

```json
{
  "ts": "<ISO-8601 UTC with ms>",
  "version": "<schema-version>",
  "service": "<harness component>",
  "env": "<local|ci|cloudflare>",
  "event": "<event-type>",
  "trace_id": "<correlation>",
  "session_id": "<harness-session>",
  "_summary": "<≤200 char LLM-friendly synopsis, optional>"
}
```

Plus event-specific fields per surface (per current schema v2 for `incidents.jsonl`).

### Sources (Thread 5)

- [How to Redact Sensitive/PII Data in Logs (OpenObserve)](https://openobserve.ai/blog/redact-sensitive-data-in-logs/)
- [Scrubbing Sensitive Data from OpenTelemetry Logs (Dash0)](https://www.dash0.com/guides/scrubbing-sensitive-data-with-opentelemetry)
- [Keep PII Out of Your Telemetry (OneUptime)](https://oneuptime.com/blog/post/2025-11-13-keep-pii-out-of-observability-telemetry/view)
- [Safe Observability: Automated PII Redaction for LLM Prompts (IJC)](https://ijcjournal.org/InternationalJournalOfComputer/article/view/2458)
- [How to Handle Log Rotation with logrotate (OneUptime 2026)](https://oneuptime.com/blog/post/2026-01-24-handle-log-rotation-logrotate/view)
- [Sensitive Data Redaction in OpenObserve](https://openobserve.ai/blog/sensitive-data-redaction-openobserve/)

---

## AC3 — Token-cost benchmark plan

**Goal**: quantify token cost of LLM reading a log fragment before vs after
schema redesign.

### Method

1. **Corpus**: 1000 sequential events from each surface (`incidents.jsonl`,
   `cache-stats.jsonl`, `events.jsonl`) — realistic 24h slice.
2. **Test prompt**: "Summarize the activity in the following log fragment and
   identify any anomalies." Fixed across before/after.
3. **Measurement**:
   - Input tokens per event (via `tiktoken` or `claude-tokens` exact counter)
   - Output tokens per event for a fixed-format summary response
   - Total tokens / 1000 events / fragment
4. **Comparison**: same prompt, same model, against three variants:
   - **A**: current schema (v1/v2/unversioned mix)
   - **B**: unified v3 schema with field-name standardization
   - **C**: variant B + optional `_summary` field populated

### Target

Variant B reduces tokens-per-event by ≥15%. Variant C reduces ≥25% (but adds
write-cost at instrumentation time — tradeoff documented).

### Defer to implementation child

The benchmark itself runs in Phase 3 as part of the schema migration child.
This R&D documents the plan; the implementation runs and reports.

---

## AC7 — Recommended implementation children (filed post-R&D approval)

| Code | Title | Lane | test_strategy | Effort | Depends |
|---|---|---|---|---|---|
| C1 | Logging surface inventory + goal-lens map (`wiki/concepts/harness-logging-inventory.md`) | docs-only | drift-lint | S | none |
| C2 | Unified event schema v3 (consolidates v1/v2/unversioned) + backward-compat shim | code-change | tdd-pyramid | M | C1 |
| C3 | SSE live-streaming pipeline (file-watch → tail → SSE → panel) | code-change | golden-file + tdd | M | C2 |
| C4 | Context Flow panel animation layer (canvas + RAF + reduced-motion) | code-change | visual-regression | M | C3 |
| C5 | Anneal queue + Baton flow panels — animation upgrade | code-change | visual-regression | S | C3, C4 |
| C6 | Retention + rotation policy implementation per AC8 | code-change | golden-file | S | C2 |
| C7 | PII/secret redaction at instrumentation + storage processor | code-change | tdd-pyramid | M | C2 |
| C8 | Goal-coverage dashboard panel (live G1..G9 signal strength) | code-change | visual-regression | M | C2, C3 |
| C9 | `instructions/observability.instructions.md` codification | docs-only | drift-lint | S | C1–C8 mostly settled |
| C10 | Token-cost benchmark (AC3 execution) + report | code-change | peer-review | S | C2 |

Total estimated effort: 5×S + 5×M ≈ 2–3 Collaborator-weeks of work. Phase 3+
spans a calendar quarter at the harness's natural cadence.

---

## AC8 — Operator approval

Per Epic Phase-0 R&D Gate (`instructions/epic-governance.instructions.md`):
**no Phase-1+ children are filed under #1339 until operator approval is recorded
on this R&D ticket.**

When approving, please indicate:

- [ ] Single-team execution accepted vs request cross-team-synthesis re-do
- [ ] Implementation children list (AC7 above) approved or with deltas
- [ ] Phase-3 effort budget acceptable
- [ ] Token-cost benchmark plan acceptable

---

## Risks / things this R&D didn't quantify

1. **LLM-actual-cost of `_summary` field**: theoretical token saving from
   shorter LLM reads, but write-time the field must be generated (LLM call or
   heuristic). Net cost may not be positive — benchmark in C10.
2. **Existing `dashboard/sse-handler.js` capacity**: not load-tested to 1000
   events/sec. Phase 3 should include a load test.
3. **Cloudflare Worker log retention**: 7d is the platform default and not
   user-tunable. If we need longer retention for HAMR audit, mirror to local
   storage on a cron.
4. **Multi-agent OTel spec is experimental**. Adopting it now means re-emission
   when spec stabilizes; acceptable via `OTEL_SEMCONV_STABILITY_OPT_IN`.

---

## References (consolidated)

All cited inline above. Total: 27 industry sources across 5 threads (≥3 per
thread, ≥10 overall — ACs satisfied).

Related harness artifacts:

- Parent Epic: #1339
- `instructions/global-standards.instructions.md` — goal-lens
- `instructions/hamr-routing.instructions.md` — HAMR mechanics
- `instructions/workflow-resilience.instructions.md` — three-tier anneal events
- `scripts/global/anneal-event-schema.js` — schema v2 precedent (#1315)
- `wiki/concepts/harness-goals.md`, `wiki/concepts/harness-goal-controls.md`
- `wiki/concepts/distributed-self-anneal.md`, `wiki/concepts/andon-pull-protocol.md`
- `dashboard/sse-handler.js` — existing extension point
