# Epic #1486 — Phase-1e: backfill audit for delivery-integrity gap

**Authority:** Claude Code Team Collaborator (Orla Harper)
**Date:** 2026-05-13
**Phase Gate compliance:** Final phase of Epic #1486 Path D per Phase-0 design (#1493).
**Scope:** Research-only. Per-ticket remediation will be filed as follow-up tickets after this doc lands.

## 1. Methodology

```bash
# 1. Inventory: closed status:done tickets in trailing 30d window
gh issue list --state closed --label status:done \
  --search "closed:>=$(date -u -d '30 days ago' +%Y-%m-%d)" \
  --limit 200 --json number,title,labels,closedAt,body

# 2. For each, query for merged-to-main PRs referencing the issue
gh pr list --state merged --search "#${N} in:body" --json number --limit 5

# 3. Classification per the megalint merge-evidence rule (#1498):
#    - skip type:epic (Epics evaluated via children)
#    - skip merge-evidence-override:approved (operator-approved bypass)
#    - skip lightweight lanes: docs-research, docs-only, trivial, research
#    - violation: closed without merged PR + non-skipped
```

Tooling: the Phase-1d snapshot writer (`scripts/global/merge-evidence-snapshot.js`) implements steps 1-3 programmatically and is the reproducible primary source. This doc cross-checks via raw gh CLI for transparency.

## 2. Quantification (30d window: 2026-04-13 → 2026-05-13)

```
Sample: 200 status:done tickets (API limit cap; true population may be larger)
+----------------------------------------+--------+-------+
| Class                                  | Count  | %     |
+----------------------------------------+--------+-------+
| has-merged-pr (already compliant)      |   87   | 44%   |
| lightweight-exempt (lane-skipped)      |   52   | 26%   |
| epic-exempt (children carry evidence)  |   19   |  9%   |
| override-exempt (label applied)        |    0   |  0%   |
| **load-bearing-violation**             | **42** |**21%**|
+----------------------------------------+--------+-------+
| TOTAL                                  |  200   | 100%  |
+----------------------------------------+--------+-------+
```

The Phase-0 raw 50% estimate refines to **21% load-bearing violation rate** after lane-aware filtering — still well above zero and worth structural remediation.

## 3. Per-team breakdown

```
+------------+-------+-----+
| Team       | Count |  %  |
+------------+-------+-----+
| unknown    |   27  | 64% |
| copilot    |   11  | 26% |
| claude-code|    4  | 10% |
| codex      |    0  |  0% |
+------------+-------+-----+
```

**Finding A:** 27 of 42 violations (64%) carry no parseable `Team&Model:` field in the issue body. These are mostly D-NNNN-format child tickets predating registry-signer conventions (filed when Manager handoffs lived elsewhere or used pre-#1451 alias formats). Attribution debt cluster — flagged for Epic #1510's instruction-channel work.

**Finding B:** Copilot has 2.75× the violation count of Claude Code in absolute terms. Both proportional to roughly the same fraction of their session output — neither team is a systemic outlier, but the Copilot delivery integrity pattern (already filed as Epic #1486 itself) confirms the trigger event was representative, not anomalous.

## 4. Violation clusters

Violations cluster around eight parent Epics + a standalone group:

```
+------------------+-------+
| Cluster          | Count |
+------------------+-------+
| standalone       |   20  |
| Epic #1133       |    7  |   (Phase-C governance backfill)
| Epic #1245       |    4  |   (Manager hygiene)
| Epic #1466       |    3  |   (Baton fidelity)
| Epic #1427       |    3  |   (Prompt compression)
| Epic #1435       |    2  |   (cross-team-edit-warn)
| Epic #1407       |    2  |   (governance-backfill-runbook)
| Epic #1130       |    1  |   (legacy)
+------------------+-------+
```

The Epic #1133, #1466, #1427 clusters match the dirty-checkout file groups identified in the 2026-05-13 response on #1490 — confirming these Epics shipped child tickets whose deliverables were committed locally but never reached main.

## 5. Per-violation classification

For the remediation recommendation, each violation falls into one of three buckets:

```
+----------------------------------+-----------------------------------------+
| Bucket                           | Recommendation                          |
+----------------------------------+-----------------------------------------+
| A. Work completed, doc-only      | Apply `merge-evidence-override:approved`|
|    deliverable existed on the    | with closing comment citing the         |
|    issue (research outputs,      | research artifact's path / PR.          |
|    governance evidence)          |                                         |
+----------------------------------+-----------------------------------------+
| B. Code completed but on a       | Reopen child + file follow-up ticket    |
|    different/unmerged branch     | for re-delivery via proper PR (per      |
|    (the #1490 dirty-checkout     | #1490 plan). Code is load-bearing       |
|    cluster: #1427, #1466)        | observability infra — must not be       |
|                                  | discarded.                              |
+----------------------------------+-----------------------------------------+
| C. Genuine historical debt —     | Apply `merge-evidence-override:approved`|
|    work no longer load-bearing,  | with `historical-debt` reason. Document |
|    superseded by later work, or  | in this audit so future readers know    |
|    cancelled implicitly          | the override is intentional.            |
+----------------------------------+-----------------------------------------+
```

## 6. Sample violation list (top 15 by recency)

```
#  Number   Team         Cluster       Recommended bucket
1  #1495    unknown      standalone    A (self-anneal evidence)
2  #1494    unknown      standalone    A (self-anneal evidence)
3  #1488    claude-code  standalone    A (already filed as #1488 follow-up)
4  #1474    copilot      Epic #1435    B (per audit; commits on feat/1298)
5  #1473    copilot      Epic #1435    B (per audit; commits on feat/1298)
6  #1470    unknown      Epic #1466    B (per #1490 response; load-bearing)
7  #1469    unknown      Epic #1466    B (per #1490 response; load-bearing)
8  #1468    unknown      Epic #1466    B (per #1490 response; load-bearing)
9  #1464    unknown      Epic #1427    B (per #1490 response; token-spend infra)
10 #1463    unknown      Epic #1427    B (per #1490 response; token-spend infra)
11 #1459    unknown      Epic #1427    B (per #1490 response; token-spend infra)
12 #1424    claude-code  Epic #1407    Needs per-ticket inspection
13 #1423    claude-code  Epic #1407    Needs per-ticket inspection
14 #1414    unknown      standalone    Needs per-ticket inspection
15 #1379    claude-code  standalone    A (decision was no-op per ADMIN_HANDOFF)
```

(Full 42-row list lives in `/tmp/backfill-data.json` from the reproducible methodology — not committed to repo because it's a transient artifact regenerable on demand.)

## 7. Remediation plan

### 7a. Immediate (this Epic)

- File **one** follow-up ticket per cluster, NOT per violation, to avoid backlog explosion:
  - **Reopen-and-redeliver Epic** for the #1427 / #1466 / #1435 dirty-checkout clusters (12 violations total) — coordinates with Codex Team's #1490 cleanup.
  - **Override-batch ticket** for clusters A and C (~30 violations) applying `merge-evidence-override:approved` with reasons documented per group.
- The Phase-1c gate (#1507) prevents *future* recurrence; the Phase-1d dashboard (#1508) makes the trend visible. Backfill is one-time cleanup.

### 7b. Attribution-debt referral

The 27 unknown-team violations are predominantly older D-NNNN-format children. These are referred to **Epic #1510** (lint coverage + instruction hardening) as input for the Phase-0 audit — specifically the AC anti-pattern and instruction-channel-optimization tracks. Improving signer attribution on new tickets prevents the unknown bucket from regrowing.

### 7c. Soak-window observability

The Phase-1d dashboard panel now visualizes per-team rolling 7d violations. After Phase-1c's gate has been live for ~14 days, the dashboard should show:

- Total violations trending toward zero (gate is forward-blocking).
- Per-team distribution reflecting current session activity, not historical debt (override-batch resolves historical).
- Any new violation = a gate evasion attempt OR a legitimate operator override → both visible.

## 8. False-positive surface respected

Per Phase-0 design, the audit excludes:

- `type:epic` tickets (19 in window) — Epics close based on children, not own code.
- Lightweight lanes (52 in window) — `lane:docs-research`, `lane:docs-only`, `lane:trivial`, `lane:research`.
- `merge-evidence-override:approved` labeled tickets (0 in window — label too new).

The audit's 21% violation rate is the lower bound; raw 50% drops cleanly to 21% under correct lane filtering.

## 9. Out of scope

- Executing remediations — each follow-up ticket gets its own baton flow.
- Cancelled tickets (`status:cancelled` + `resolution:cancelled`) — not counted; goal-invalidated, not delivery failures.
- Tickets older than 30 days — initial window. A second pass over `closed:>=2026-03-13` may surface more historical debt; deferred to a follow-up.
- Cryptographic non-repudiation of close events (Epic #1298 territory).

## 10. References

- Epic #1486 Phase-0 design: [research/epic-1486-phase-0-design-2026-05-13.md](epic-1486-phase-0-design-2026-05-13.md)
- Phase-1a megalint rule: `scripts/global/megalint/merge-evidence.js` (PR #1499)
- Phase-1b workflows: `.github/workflows/merge-evidence-{check,cron}.yml` (PR #1503)
- Phase-1c required gate: `scripts/global/megalint/merge-evidence-pr-gate.js` (PR #1507)
- Phase-1d dashboard: `dashboard/api/merge-evidence-handlers.js` + `dashboard/js/merge-evidence-panel.js` (PR #1509)
- Cross-reference: response on Codex Team #1490 (dirty checkout ownership analysis)
- Future-facing referral: Epic #1510 (lint + instruction hardening) — owns the attribution-debt remediation

---

Signed-by: Orla Harper
Team&Model: claude-code:opus-4-7@anthropic
Role: collaborator
