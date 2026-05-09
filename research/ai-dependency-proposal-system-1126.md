# AI Dependency Proposal System R&D

Date: 2026-05-09
Ticket: #1126
Parent Epic: #1125
Lane: docs-research

## Contamination Declaration

Read before authoring: issue #1126, parent #1125, sibling context #1112/#1113,
repo instructions, current cascade/governance scripts, ADR-010, and public web
sources listed below. I did not read any other team's unpublished #1126 work.

## Recommendation

Use a deterministic-first, LLM-assisted dependency proposal system:

1. Build the canonical graph from explicit issue text plus GitHub native issue
   dependency API data.
2. Run low-cost pair analysis only on candidate pairs selected by deterministic
   filters, not every possible issue pair.
3. Ask the model for strict JSON proposals with evidence spans, confidence, and
   an explicit "no edge" option.
4. Persist proposals in a review queue. Never mutate ticket bodies or native
   dependency APIs without operator acceptance.
5. Emit graph health, cycle findings, stale proposals, and weekly token cost in
   `governance-audit` and `/quota`.

This hybrid is the best fit because current relation-extraction research warns
that raw LLM extraction degrades on dense relation graphs, while classifier or
candidate-first approaches improve focus and cost.

## Web Research

- websearch: https://docs.github.com/en/rest/issues/issue-dependencies
  (accessed 2026-05-09T16:38Z) - GitHub exposes native blocked-by/blocking issue
  dependency REST endpoints; use as authoritative mutation target.
- websearch: https://linear.app/docs/issue-relations/
  (accessed 2026-05-09T16:38Z) - Linear models blocking, related, and duplicate
  relationships as first-class issue relations.
- websearch: https://linear.app/docs/triage-intelligence
  (accessed 2026-05-09T16:38Z) - Linear surfaces AI-suggested issue properties
  and relationships with user feedback paths.
- websearch: https://linear.app/docs/project-dependencies
  (accessed 2026-05-09T16:38Z) - Timeline dependency visualization validates the
  need for visible blocked/blocking fields.
- websearch: https://arxiv.org/abs/2408.13889
  (accessed 2026-05-09T16:38Z) - Classifier-first DocRE narrows LLM attention to
  likely relation-bearing entity pairs.
- websearch: https://huggingface.co/papers/2406.14745
  (accessed 2026-05-09T16:38Z) - RAG/fine-tuned LLM relation extraction improves
  implicit relation detection, useful for ambiguous ticket coupling.
- websearch: https://openreview.net/pdf?id=ERNONkJfcX
  (accessed 2026-05-09T16:38Z) - Graph-based dependency parsing can beat raw LLM
  relation extraction as graph complexity increases.
- websearch: https://platform.openai.com/docs/guides/structured-outputs
  (accessed 2026-05-09T16:38Z) - Structured Outputs guarantee schema adherence
  when supported; JSON mode alone is insufficient.

## Repo Evidence

- repo: .github/copilot-instructions.md#L41-L47 - repo requires JSON/Markdown,
  line discipline, and one live worktree per agent.
- repo: .github/copilot-instructions.md#L81-L93 - Team&Model signing, HAMR, and
  harness goal ordering are mandatory.
- repo: inventory/team-model-signatures.json#L1-L18 - alias and Team&Model
  signing should resolve from the registry, with fallback alias seed.
- repo: scripts/global/model-routing-policy.json#L18-L24 - fleet cost is zero;
  Haiku fallback has a tiny per-token cost.
- repo: scripts/global/model-routing-policy.json#L25-L55 - routine extraction is
  fleet-class; architecture/concurrency risks may escalate.
- repo: scripts/global/cascade-dispatch.js#L32-L43 - current Fleet path uses
  Ollama and reports local-tier failures.
- repo: scripts/global/cascade-dispatch.js#L52-L80 - low-quality Fleet responses
  already escalate to Haiku and record telemetry.
- repo: scripts/global/governance-audit.js#L11-L17 - audit emits
  `/tmp/governance-audit.json` and caps ticket fetches.
- repo: scripts/global/governance-audit.js#L30-L55 - audit already normalizes
  ticket labels and detects governance violations.
- repo: research/cross-team-rd-protocol-v2-2026-05-09.md#L91-L107 - v2 R&D
  requires web evidence, repo anchors, and explicit contamination declaration.

## Architecture Choice

Pair-only analysis is simple but O(n squared) and wasteful. Whole-graph prompting
can catch transitive context but is brittle, harder to cache, and risky for
privacy/cost. The recommended hybrid is:

1. Deterministic seed graph: parse `Depends-on`, `Blocks`, `Blocked-by`,
   `Coupled-with`, `Refs`, parent epic links, PR closing links, and native API
   dependencies.
2. Candidate generator: score pairs using shared epics, shared labels, title/body
   n-grams, explicit object names, references to the same files/scripts, and
   temporal proximity.
3. LLM pair classifier: only analyze candidates above a deterministic threshold.
4. Graph consistency pass: compute cycles, missing reciprocal text/API edges,
   orphan proposals, and critical-path length.

## Prompt Template

System: You propose issue dependency edges for a governed GitHub repo. Return
strict JSON only. Do not invent issue numbers. No autonomous edits.

Input: two issue records, existing edges, parent epics, labels, body excerpts,
and candidate-generator reasons.

Output schema:

```json
{
  "schema_version": 1,
  "edge": {
    "from": 1126,
    "to": 1125,
    "type": "depends-on|blocks|coupled-with|informs|duplicate-of|none",
    "direction_confidence": 0.0
  },
  "confidence": 0.0,
  "rationale": "short operator-facing reason",
  "evidence_spans": [
    {"issue": 1126, "quote": "short excerpt", "field": "body"}
  ],
  "risks": ["false-positive", "stale-body", "ambiguous-direction"]
}
```

Acceptance rule: create a proposal at confidence >= 0.85. Require two-pass
agreement or reviewer override for native API mutation. Never auto-accept.

## Model, Cost, and Caching

Default model: Fleet `qwen2.5:7b-instruct` through `cascade-dispatch`, because
routine extraction is fleet-class and zero cost. Escalate only ambiguous pairs to
Haiku when Fleet is unavailable, invalid JSON is returned, or confidence lands
between 0.70 and 0.85.

Cache key: `repo + issueA + sha256(bodyA,titleA,labelsA,updatedAtA) + issueB +
sha256(bodyB,titleB,labelsB,updatedAtB) + promptVersion + modelId`.

Cost projection: with 200 open tickets, candidate filtering should keep analysis
to about 300-800 pairs, not 19,900 all-pairs calls. Fleet cost remains $0. If 5%
escalate to Haiku at about 1.5k tokens/pair, 40 escalations cost about 60k tokens,
well under the issue target of $1/week under current policy pricing.

## Operator Review UX

Ship the first implementation as `npm run deps:review` because it is fastest,
terminal-native, and compatible with all teams. Dashboard and PR-bot surfaces can
consume the same proposal JSON later.

Review modes:

- Batch summary: show new proposals sorted by confidence and critical-path risk.
- Focused review: accept/reject one proposal with source excerpts and graph
  preview.
- Persistence: accepted proposals update both ticket text and GitHub native API;
  rejected proposals store a tombstone to suppress repeats until inputs change.

## Artifact Schemas

`planning/dep-graph.json`: nodes `{id,title,state,labels,epic,updated_at}` and
edges `{from,to,type,source:["text","github_api","accepted_proposal"],status}`.

`planning/dep-proposals.json`: proposals `{id,edge,confidence,rationale,
evidence_spans,model,cache_key,status,reviewer,reviewed_at,rejection_reason}`.

`planning/dependencies.md`: generated Markdown with Mermaid graph, critical path,
cycles, review queue summary, and last refresh metadata.

## Integration Matrix

| Surface | Integration |
| --- | --- |
| #1112 synthesis | Adds cross-epic dependency visibility before R&D child filing. |
| #1113 self-anneal | Stale proposal queues and repeated missing-dep findings become sensors. |
| governance-audit.js | Add cycle count, mismatch count, stale-review age, and cost totals. |
| HAMR /quota | Report pair counts, cache hits, Fleet share, fallback count, token spend. |
| GitHub API | Native dependency writes only after operator acceptance. |

## Risk Register

| Risk | Mitigation |
| --- | --- |
| False positives | 0.85 threshold, evidence spans, mandatory operator acceptance. |
| Ambiguous direction | Ask for `coupled-with` or `none`; require reviewer override. |
| Prompt injection in issues | Treat issue text as untrusted data; forbid tool calls in model prompt. |
| Cost blowup | Candidate filtering, cache by body hash, Fleet first, weekly quota gate. |
| Stale proposals | Include body hashes and expire when issue body/title/labels change. |
| Native API drift | Reconcile text edges and GitHub API edges before proposing mutation. |

## Nine-Goal Rating

| Goal | Rating | Rationale |
| --- | --- | --- |
| Governance | 10/10 | Operator review and native API reconciliation are required. |
| Quality | 9/10 | Deterministic graph plus LLM classifier reduces blind spots. |
| Zero Cost | 9/10 | Fleet-first with cached Haiku fallback stays under $1/week. |
| Privacy | 8/10 | Issue bodies leave only on fallback; prompts treat bodies as untrusted. |
| Portability | 9/10 | JSON/Markdown artifacts work across Codex, Copilot, and Claude Code. |
| Resilience | 8/10 | Cache and graceful no-Fleet fallback prevent hard failure. |
| Throughput | 8/10 | Candidate filtering avoids all-pairs growth. |
| Observability | 9/10 | Audit, quota, and review queue metrics are explicit. |
| Interoperability | 9/10 | Uses GitHub native dependencies plus repo-local text conventions. |

## Team&Model Signature

Signed-by: Nova Harper
Team&Model: codex:gpt-5@codex-cli
Role: collaborator
