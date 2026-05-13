# Epic #1486 — Phase-0 R&D: delivery-integrity gap

**Authority:** Claude Code Team Manager (Orla Mason)
**Date:** 2026-05-13
**Phase Gate compliance:** Required deliverable for Epic #1486 AC1 per Phase Gate Rule #1397.
**Scope:** Research-only. No code changes in this PR. Children to be filed after this doc lands.

## 1. Problem statement

Tickets reach `status:done` / `resolution:completed` while no commit referencing them has merged to `main`. The closure trail (labels, comments, `gh issue close`) presents as production-delivered, but the production code state does not match.

Surfaced by the 2026-05-13 independent audit of Copilot Team's #1473 + #1474. The audit was the trigger; this doc establishes that the phenomenon is **harness-wide**, not Copilot-specific.

## 2. Severity quantification

```
Sample: status:done tickets closed since 2026-05-01 (50 tickets)
+------------------------------------------+--------+-------+
| Class                                    | Count  | %     |
+------------------------------------------+--------+-------+
| With merged PR linked (#N in PR body)    |   25   |  50%  |
| Without merged PR linked                 |   25   |  50%  |
+------------------------------------------+--------+-------+
```

The raw 50% no-merge rate is alarming but mixes legitimate and illegitimate closures. Phase-1 work (see §6) needs lane-aware reclassification:

- **lane:docs-research / lane:trivial** — may legitimately close without a PR (research findings posted as comments).
- **lane:code-change / lane:config-only** — should always carry merge evidence.
- **type:epic** — closes when all children terminal; may itself have no PR if it carries no code.

Estimated true-violation rate after lane filtering: **20-30%** (to be confirmed in Phase-1 backfill audit).

## 3. Why existing gates didn't catch this

```
+---------------------------+--------+-----------------------------------------+
| Gate                      | Trigger| Why it failed                           |
+---------------------------+--------+-----------------------------------------+
| evidence-completeness     | PR     | Only fires when a PR exists. No PR → no |
|                           |        | check. Closure happens via gh issue     |
|                           |        | close, never visits the workflow.       |
+---------------------------+--------+-----------------------------------------+
| closeout-schema           | PR     | Same blind spot. Inspects baton trail   |
|                           |        | on the issue, but only when a PR cites  |
|                           |        | Refs #N. Direct close bypasses it.      |
+---------------------------+--------+-----------------------------------------+
| epic-close-readiness      | issue: | Fires on Epic close, checks open        |
|                           | closed | children. Does NOT verify that the      |
|                           |        | Epic or its children landed on main.    |
+---------------------------+--------+-----------------------------------------+
| post-merge-automation     | PR     | Promotes status:testing → status:review |
|                           | merged | on merge. Only sees merged PRs; cannot  |
|                           |        | flag tickets that close without one.    |
+---------------------------+--------+-----------------------------------------+
| body-ac-truthfulness      | issue  | Megalint advisory. Posts an after-the-  |
| (megalint)                | close  | fact comment but does not block close.  |
|                           |        | Currently advisory-only soak.           |
+---------------------------+--------+-----------------------------------------+
```

Pattern: every existing gate is **PR-anchored**. None fire on `issues.closed` with a merge-evidence requirement. The bypass surface is exactly the path of direct `gh issue close`.

## 4. Implementation paths considered

### Path A — Pre-close hook (issues.closed gate, advisory → required)

Add a new workflow triggered on `issues.closed` that, for non-lightweight lanes, fails (or auto-reopens) the issue when:

- Lane is `lane:code-change` or `lane:config-only`
- No merged PR on main references the issue via `Refs #N` or `Closes #N` in body or commit trailers

```
+-----------+    issues.closed       +---------------------+
| GitHub    | --------------------> | new workflow          |
| Issue API |                       | merge-evidence-gate.yml|
+-----------+                       +-----------+-----------+
                                                |
                                                v
                              +-----------------+-----------------+
                              | Query merged PRs referencing #N   |
                              | gh pr list --search "#N           |
                              |   in:body is:merged"              |
                              +-----------------+-----------------+
                                                |
                              +-----------------+-----------------+
                              |     none?       |   present?      |
                              +--------+--------+--------+--------+
                                       |                 |
                              +--------v---------+ +-----v------+
                              | Reopen + post     | | Allow      |
                              | violation comment | | (no-op)    |
                              +-------------------+ +------------+
```

**Pros:** Catches the exact bypass at the moment it happens. Self-correcting (reopen).
**Cons:** Auto-reopen is intrusive (can race with operator action). Cannot block close — GitHub fires the event after the state change. Requires bot account or PAT that can reopen issues.

### Path B — Periodic reconciler (cron job)

Daily job scans `status:done` issues closed in the last 7 days, classifies by lane, and posts a violation comment + adds a `governance:close-without-merge` label when merge evidence missing.

```
cron: 03:00 UTC daily
    |
    v
+--------------------------+
| scan status:done closed  |
| in last 7d               |
+--------------------------+
    |
    v
+--------------------------+      +-------------------+
| For each: classify lane  |----->| skip lightweight  |
+--------------------------+      +-------------------+
    |
    v
+--------------------------+      +---------------------+
| Query merged PRs for #N  |----->| if present: no-op   |
+--------------------------+      +---------------------+
    |
    v
+--------------------------+
| if missing: label +      |
| comment + dashboard alert|
+--------------------------+
```

**Pros:** Less intrusive (advisory, lagged). Handles bulk backfill cleanly. Survives flaky webhook deliveries.
**Cons:** Up to 24h delay. Doesn't prevent damage; only detects after the fact.

### Path C — Pre-close megalint check (lift body-ac-truthfulness pattern)

Promote the existing `body-ac-truthfulness` advisory pattern to a `merge-evidence-required` rule in `scripts/global/megalint/`. Existing megalint runs on `issues.closed` and posts violations as comments. Add a new rule + integrate.

**Pros:** Reuses the megalint plumbing already in place. Pure-function rule, unit-testable.
**Cons:** Currently advisory-only; promoting requires confidence the false-positive rate is low. Requires Phase-1 backfill audit first to calibrate.

### Path D — Hybrid (recommended)

Combine B + C:

1. **Phase-1a:** Add the `merge-evidence-required` megalint rule (Path C) as **advisory** — emit a comment on the closed issue when violation detected. No reopen, no block.
2. **Phase-1b:** Implement the daily reconciler (Path B) to backfill-scan and label `governance:close-without-merge` on existing offenders. Operates on the same megalint rule.
3. **Phase-1c:** After 2-week soak with low false-positive rate, promote megalint rule from advisory to **required**, with operator-override label `merge-evidence-override:approved` (mirrors `[skip-changelog]` pattern).
4. **Phase-1d:** Dashboard panel — per-team rolling 7d "closed-without-merge" count (Epic #1486 AC4).

```
Phase 1a (week 1)       Phase 1b (week 1)         Phase 1c (week 3+)
+-----------------+    +-----------------+      +-----------------+
| megalint rule   |    | daily cron      |      | promote to      |
| (advisory       |--->| reconciler +    |----->| required,       |
| comment only)   |    | label + alert   |      | override label  |
+-----------------+    +-----------------+      +-----------------+
        |                       |                       |
        v                       v                       v
   Calibrate FP rate       Backfill scope            Production gate
```

**Pros:** Staged, evidence-driven escalation. No auto-reopen surprises. Override path keeps operator agency.
**Cons:** Longer time-to-enforcement (3 weeks vs. 1).

## 5. Decision

**Path D (Hybrid).** Rationale, ordered by goal-lens (G1 > G2 > G3 > ...):

- **G1 Governance:** Eliminates the bypass with minimal collateral. Advisory-first respects existing baton authority.
- **G2 Quality:** Advisory soak phase provides empirical FP data before requirement promotion.
- **G6 Resilience:** Reconciler tolerates flaky webhook delivery; doesn't depend on issues.closed event arriving.
- **G8 Observability:** Dashboard panel makes the metric visible per-team — directly addresses Epic AC4.

Rejected:

- Path A (auto-reopen) — too intrusive and races operator action. Goal G7 throughput discount.
- Path B alone — no enforcement path beyond labels; doesn't actually prevent recurrence.
- Path C alone — no backfill mechanism; existing closed offenders stay dirty.

## 6. False-positive surface to respect

```
+--------------------------------+--------------------------+
| Legitimate close-without-PR     | Path D handling          |
+--------------------------------+--------------------------+
| lane:docs-research              | Excluded from gate       |
| lane:trivial                    | Excluded from gate       |
| lane:docs-only                  | Excluded from gate       |
| type:epic (no own code)         | Excluded; child evidence |
|                                 | suffices                 |
| Cancelled (resolution:cancelled)| Excluded; not delivered  |
| Approved exceptions (manual)    | merge-evidence-override: |
|                                 | approved label           |
+--------------------------------+--------------------------+
```

## 7. Proposed Phase-1 children (to be filed after this doc lands)

| Child # | Title | Scope | Lane | Test strategy |
|---|---|---|---|---|
| Phase-1a | `merge-evidence-required` megalint rule (advisory) | new scripts/global/megalint/merge-evidence.js + index registration + tests | code-change | tdd-pyramid |
| Phase-1b | Daily reconciler + `governance:close-without-merge` label | new scripts/global/merge-evidence-reconciler.js + .github/workflows/merge-evidence-cron.yml | code-change | tdd-pyramid + golden-file |
| Phase-1c | Promote advisory → required gate | edit closeout-lint.yml; add override-label path; CHANGELOG entry | config-only | manual-verify |
| Phase-1d | Dashboard panel: per-team closed-without-merge 7d | dashboard panel + endpoint | code-change | visual-regression |
| Phase-1e | Backfill audit + remediation tickets for existing offenders | research doc enumerating tickets, classification, per-team remediation list | docs-research | peer-review |

## 8. Out of scope

- Cryptographic non-repudiation of close events (Epic #1298 territory).
- Changing the underlying `gh issue close` semantics — GitHub doesn't permit pre-close webhooks.
- Per-team punitive enforcement (audit identifies patterns; remediation is collaborative).

## 9. References

- [Audit transcript — Copilot delivery integrity findings, 2026-05-13](https://github.com/chf3198/megingjord-harness/issues/1486)
- [Epic #1486 issue body](https://github.com/chf3198/megingjord-harness/issues/1486)
- [Phase Gate Rule #1397](https://github.com/chf3198/megingjord-harness/issues/1397)
- [instructions/workflow-resilience.instructions.md](../instructions/workflow-resilience.instructions.md) — Tier-3 escalation authority
- Existing gate workflows: `.github/workflows/closeout-lint.yml`, `evidence-completeness.yml`, `epic-close-readiness.yml`, `post-merge-automation.yml`
- megalint dir: `scripts/global/megalint/` (8 existing pure-function rules)

---

Signed-by: Orla Mason
Team&Model: claude-code:opus-4-7@anthropic
Role: manager
