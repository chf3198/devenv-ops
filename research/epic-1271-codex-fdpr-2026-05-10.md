# Epic #1271 Codex FDPR

**Ticket**: #1286  
**Parent Epic**: #1271  
**Date**: 2026-05-10  
**Purpose**: Final development plan recommendation after peer critique.

## Executive Recommendation

Codex recommends adopting the converged Wave 1-4 plan, with one correction:
the canonical implementation contract must be a portable Epic-body AC schema
and reconciler JSON, while GitHub Issue Fields, hierarchy, semantic search,
release evidence, and dependency APIs serve as adapters.

That keeps Claude Code's governance-first ordering, Copilot's 2026 platform
currency, and Codex's deterministic truth-table design without making the
Epic truthfulness gate depend on preview, private-project, or rate-limited
GitHub features.

## Peer Critique Response

Claude Code's critique of Codex was right on ordering. Codex #1274 put the
reconciler and close-readiness machinery first, but the safer first control is
the `EPIC_RESCOPE` artifact plus Consultant-only close authority. This prevents
invalid closures immediately, before any write-back reconciler exists.

Copilot's critique of Codex was right on platform usage. Codex underweighted
GitHub's 2026 issue fields, hierarchy, semantic search, release evidence, and
rulesets bypass improvements. Those features should materially improve the
adapters and dashboard/reporting layer.

Codex's counterpoint to both critiques is scope control. GitHub Issue Fields
are still public preview, private-project scoped, and subject to change, so
they cannot be the only canonical AC store. Semantic/hybrid issue search is
useful for discovery sensors, but the 10 req/min budget makes it a supporting
signal, not the close gate itself.

## Final Architecture

### Canonical Data Contract

Use the Epic body as the portable source of truth:

```yaml
AcceptanceCriteria:
  - id: AC1
    text: Manager narrative cannot diverge from AC state.
    evidence:
      kind: workflow
      ref: epic-close-readiness-v2
    status: open
  - id: AC3
    text: Time-windowed ACs have explicit state.
    status: measuring
    recheck_after: 2026-05-16
    sensor: governance-health-score
```

The reconciler emits one JSON row per AC:

```json
{
  "ac_id": "AC3",
  "declared_status": "measuring",
  "computed_status": "blocked_until_recheck",
  "evidence_refs": ["issue:#1130", "sensor:ghs"],
  "rescope_ref": null,
  "ready_to_close": false
}
```

GitHub Issue Fields mirror this when available. If field data conflicts with
the body schema, the reconciler reports the conflict and keeps the body schema
authoritative until an operator-approved migration changes that rule.

## Implementation Waves

### Wave 1: Governance Certainty

Ship first:

- `EPIC_RESCOPE` template and validator.
- Consultant-only `CONSULTANT_EPIC_CLOSEOUT`.
- Signer independence: Manager author of scope cannot sign final Epic close.
- Closeout schema requiring reconciler summary or explicit rescope reference.

Acceptance gates:

- Closing an Epic with unmet undeferred ACs reopens or blocks.
- Every deferred AC has reason, expiry or recheck date, approver, and follow-on.
- `ADMIN_VISUAL_QA` is N/A unless UI files change.

### Wave 2: Deterministic Truth Table

Ship second:

- `scripts/global/epic-ac-reconcile.js`.
- `epic-close-readiness` v2 consuming reconciler JSON.
- Manager narrative lint in advisory mode.
- GHS signals for declared-complete-with-unmet-AC and missing rescope.

Rollout:

- Two-week report-only shadow mode.
- No issue body write-back until false-positive rate is under 5 per 100 Epics.
- Promote only the close gate after shadow evidence is posted.

### Wave 3: Dependency And Measuring Depth

Ship third:

- `status:measuring` label and body fields: `Measure-window`, `Recheck-after`,
  `Sensor`, `Fallback-owner`.
- All-issue dependency DAG using native GitHub dependencies when available.
- Text fallback for `Depends-on`, `Blocks`, `Blocked-by`, and `Coupled-with`.
- Cycle detection and unresolved blocker reporting.

Operational guardrails:

- Native dependency API writes are low-volume and backoff-safe.
- Semantic/hybrid issue search is capped below 10 req/min.
- Lexical search and local cached issue snapshots are the default for gates.

### Wave 4: Migration And Hardening

Ship last:

- Advisory backfill for #1130, #1103, #1113, and #1211.
- Wiki consolidation: merge duplicate `[[epic-ac-reconciliation]]` detail into
  `[[epic-state-truthfulness]]` or mark one as the narrower subtopic.
- Operator dashboard/report for truthfulness drift.
- Optional OPA/Rego spike only after the JS gates prove stable.

## Implementation Children To File After Operator Approval

1. Wave 1 governance gate: `EPIC_RESCOPE` plus Consultant close authority.
2. Wave 2 reconciler: AC parser, truth-table JSON, tests, and close-readiness v2.
3. Wave 2 sensors: narrative lint and GHS truthfulness signals.
4. Wave 3 state/dependency: `status:measuring`, recheck cron, dependency DAG.
5. Wave 4 migration: advisory audit, wiki consolidation, dashboard report.

Total estimate: 10 to 14 focused engineering days. The first child should be
small enough to merge in one day and should not wait for the full reconciler.

## Success Metrics

- Zero Epic close events with unchecked undeferred ACs after Wave 1.
- 100% valid `EPIC_RESCOPE` schema for deferred ACs.
- 100% Consultant closeout comments include reconciler or rescope evidence.
- Less than 5 false positives per 100 Epics during Wave 2 shadow mode.
- 100% closed Epics in the prior 7 days evaluated by GHS truthfulness signals.
- All dependency cycles in test fixtures detected before close readiness passes.

## Rejected Alternatives

Full Issue Fields source of truth is rejected for v1. It is attractive, but
current docs say issue fields are public preview and limited to private
projects, with org/project limitations. Use it as an adapter.

Immediate reconciler write-back is rejected for v1. Report-only mode gives the
teams a chance to calibrate parser edge cases before automation edits Epic
bodies.

OPA/Rego-first policy is rejected for v1. The harness already has JS and
GitHub Actions governance patterns; adding another policy runtime now would
slow the highest-priority governance fix. Keep it as a Wave 4 spike.

AI-generated ACs as authority are rejected. AI may propose AC predicates, but
Microsoft Research's 2026 intent-formalization framing makes the validation of
specifications the central bottleneck. Operator-reviewed AC intent remains the
source of authority.

## Websearch Evidence

- GitHub issue fields are public preview, typed, org-level metadata, currently
  private-project scoped and subject to change:
  https://docs.github.com/en/issues/planning-and-tracking-with-projects/understanding-fields/about-issue-fields
- GitHub's 2026 Issue Fields changelog confirms selected-org rollout, API
  support, field events, and the value of typed metadata:
  https://github.blog/changelog/2026-03-12-issue-fields-structured-issue-metadata-is-in-public-preview
- GitHub hierarchy view GA strengthens sub-issue and parent/child visibility:
  https://github.blog/changelog/2026-03-19-hierarchy-view-in-github-projects-is-now-generally-available/
- GitHub semantic/hybrid issue search is API-accessible but limited to
  10 req/min for semantic and hybrid queries:
  https://github.blog/changelog/2026-04-02-improved-search-for-github-issues-is-now-generally-available/
- GitHub tasklist block retirement means sub-issues are the preferred tracking
  surface, while markdown tasklists remain useful fallback syntax:
  https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/about-tasklists
- GitHub issue dependency REST docs confirm native blocked-by relationships,
  write permission requirements, and secondary-rate-limit risk:
  https://docs.github.com/en/rest/issues/issue-dependencies
- GitHub rulesets now support individual bypass actors, useful for exception
  provenance that should be tied to `EPIC_RESCOPE`:
  https://github.blog/changelog/2026-05-07-repository-rulesets-user-bypass-and-branch-renaming/
- Zhong et al. 2026 found human reviewers add testing, understanding, and
  knowledge-transfer feedback, and exchange 11.8% more rounds for AI-generated
  code. This supports Consultant close authority:
  https://arxiv.org/abs/2603.15911
- Microsoft Research 2026 argues that validating specifications is the central
  bottleneck in intent formalization, supporting explicit AC evidence contracts:
  https://www.microsoft.com/en-us/research/publication/intent-formalization-a-grand-challenge-for-reliable-coding-in-the-age-of-ai-agents/

## Karpathy LLM Wiki Use

Codex used the wiki as the local memory layer before writing the FDPR:
`[[epic-state-truthfulness]]`, `[[epic-ac-reconciliation]]`, the #1271 source
pages, `[[epic-governance]]`, `[[baton-protocol]]`, and
`[[harness-goal-controls]]` supplied the local vocabulary. Fresh websearch then
updated the source caveats around Issue Fields, semantic search budgets,
tasklist retirement, and dependency API limits.

This FDPR adds a source page for the final recommendation and updates
`wiki/index.md` plus `wiki/log.md`, keeping the Karpathy pattern intact:
concepts for durable ideas, sources for external or ticket-specific research,
and the index as the deterministic lookup surface.

## Final Recommendation

File implementation children only after the operator posts synthesis approval
on #1271. When approved, begin with Wave 1 governance certainty. Do not wait
for the full reconciler to enforce `EPIC_RESCOPE` and Consultant-only close
authority. The fastest trust repair is preventing unsupported Epic completion
claims; the truth-table automation can then make that control richer.

Signed-by: Nova Harper  
Team&Model: codex:gpt-5@codex-cli  
Role: collaborator
