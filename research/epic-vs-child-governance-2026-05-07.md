# Research: Epic state taxonomy + label-lint Epic-aware rules

**Ticket**: #1075 (Epic #1074)
**Lane**: docs-research
**Date**: 2026-05-07
**Author**: Orla Harper (claude-code:opus-4-7@anthropic, role: collaborator)

## Executive recommendation

Add **two** new `status:` values for Epic-only use: `status:dormant` and `status:deferred`. Make `label-lint.yml` Epic-aware so that `type:epic` tickets receive different rules than child tickets. Update `instructions/epic-governance.instructions.md` with the new state diagram. Defer migration of historical cancelled Epics to client review.

`status:r&d-complete` is **not** recommended as a separate state — it overlaps with `status:in-progress` for an Epic where Manager is actively designing dev children, which is normal Manager work.

---

## A. State taxonomy

### Recommended new states

| State | Meaning | Who triggers | Example |
|---|---|---|---|
| `status:dormant` | Active goal; no current work; awaits external trigger or scheduled review | Manager | Epic shipped one milestone, awaits decision on next phase |
| `status:deferred` | Active goal; externally blocked with no ETA | Manager | Epic blocked on Aperture beta + plan tier upgrade |

### States NOT added (and why)

- **`status:r&d-complete`** — overlaps with `status:in-progress` (Manager designing dev children IS active work). Adding it complicates the state machine without proportional benefit. The "between R&D close and dev-child design" gap is short enough that Manager simply holds the Epic at `status:in-progress` while doing the design work.
- **`status:paused`** — synonymous with `dormant`. Pick one term.

### Namespace decision

Use existing `status:` namespace. Reasons:
- Single source of truth — operators check ONE label prefix to know lifecycle
- Existing label-lint Rule 1 enforces "exactly one `status:`" — extends naturally
- Adding a parallel `lifecycle:` namespace would double the cognitive load with no portability benefit

Tradeoff: status: namespace was originally designed around child-ticket flow. Mitigated by Epic-aware lint rules (see C below).

---

## B. Transition rules

```
   Allowed transitions for Epics (type:epic only):
   ────────────────────────────────────────────────
   
   backlog ────► triage ────► in-progress
                    ▲              │
                    │              ▼
                    │           review ────► done
                    │              ▲              ▼ (+ closed)
                    │              │
                    │       ┌──────┴───────┐
                    │       │              │
                    └─── dormant ─────► deferred
                            ▲              │
                            │              │ (block clears)
                            └──────────────┘
   
   Special transitions:
   • backlog → cancelled       — Manager: goal invalid/duplicate
   • triage → cancelled        — Manager: scope reveals invalid goal
   • in-progress → cancelled   — only after R&D shows goal is invalid
   • dormant → cancelled       — quarterly review affirms goal no longer applies
   • deferred → cancelled      — blocker cleared but goal no longer relevant
```

### Trigger rules

| Transition | Triggered by | Required artifact |
|---|---|---|
| `in-progress → dormant` | Manager (after milestone closes; no immediate next dev work) | Comment explaining current milestone + expected trigger to resume |
| `in-progress → deferred` | Manager (external blocker discovered) | Comment naming the blocker + ETA condition |
| `dormant → triage` | Manager (review cadence fires; or external trigger occurs) | Comment with re-scope plan |
| `deferred → in-progress` | Manager (blocker resolved) | Comment confirming blocker cleared |
| `dormant ↔ deferred` | Manager (state of blocker changes) | Comment explaining change |

### Review cadence

- All `dormant` and `deferred` Epics receive a **90-day review** comment
- Review must produce one of: stay-dormant (with new ETA hint), reclassify, cancel
- Initially manual (Manager runs quarterly); future automation candidate

---

## C. Label-lint Epic-aware rules

### Conflicts in current label-lint with epic-governance

| Current label-lint rule | Conflicts with epic-governance how |
|---|---|
| Rule 4: `status:backlog` + `role:` forbidden | `epic-governance` says "Epic always carries `role:manager`" → Epics in backlog implicitly violate this rule (currently silently tolerated for Epics) |
| Rule 8: `status:in-progress` requires `role:collaborator` | Epics never carry `role:collaborator` → Epics at `status:in-progress` would violate, but lint doesn't fire because Epic stays in-progress only briefly |
| Rule 3: `status:done` + `role:` forbidden | At Epic close, `role:manager` must be removed; this works |
| Rule 5: `status:triage` requires `role:manager` | ✓ Aligns with epic-governance |

### Proposed Epic-aware rule overrides

For tickets with `type:epic`:

```
   Rule E1: Epic always carries role:manager (any status except done/cancelled)
   Rule E2: Override Rule 4 — status:backlog + role:manager is REQUIRED for Epics
   Rule E3: Override Rule 8 — status:in-progress + role:manager is REQUIRED (not role:collaborator)
   Rule E4: Override Rule 3 — at status:done, role:manager must be removed (matches existing)
   Rule E5: status:dormant + role:manager required
   Rule E6: status:deferred + role:manager required
   Rule E7: dormant/deferred Epics SHOULD have a comment from last 90 days (warn, not fail)
```

### Strict-superset analysis

- Existing closed Epics: untouched (state already `done` or `cancelled`)
- Existing open Epics: today they don't carry `role:manager` consistently. Per Rule E1, Manager should add `role:manager` to all open Epics — this is a one-time normalization that the migration child handles.
- Existing label-lint behavior: continues to apply to non-Epic tickets unchanged

---

## D. Migration impact

### Existing open Epics (after this session)

| Epic | Current state | Recommended action |
|---|---|---|
| #866 | status:triage | Confirm `role:manager` present; otherwise no change |

### Existing closed/cancelled Epics — re-review candidates

| Epic | Closed as | Should re-review? | Rationale |
|---|---|---|---|
| #759 | cancelled (idle) | YES — could become `status:dormant` | The cross-epic dependency goal may still be valid; was killed for being idle, not invalid |
| #760 | cancelled (idle) | YES — could become `status:dormant` | Error-handling AC standards may still be valid; same situation |
| #966 | cancelled (R&D) | NO — research found contract conflict | Goal contradicts operator-identity-context. Cancel is correct; would need contract change to re-open |

**Migration strategy**: case-by-case, surfaced to client. NOT a batch automated migration.

### Files affected

- `.github/workflows/label-lint.yml` — add Epic-aware rules
- `instructions/epic-governance.instructions.md` — new state diagram
- `instructions/ticket-driven-work.instructions.md` — taxonomy update
- 2 new GitHub labels: `status:dormant`, `status:deferred`
- (No code changes to scripts)

---

## E. Review cadence mechanism

### Initial: manual

Manager runs `gh issue list --label "status:dormant,status:deferred"` quarterly. For each:
1. Read latest comment (which should be from the last 90 days per Rule E7).
2. Decide: keep dormant, reclassify, or cancel.
3. Post review comment with `EPIC_REVIEW` artifact tag.

### Future automation candidate (NOT in this Epic's scope)

A GitHub Action that:
- Runs nightly
- For each `status:dormant` or `status:deferred` Epic:
  - If last comment >90 days old, post a review-due comment
  - Optionally tag the operator
- Filed as a separate follow-on Epic if desired

---

## F. Child ticket sketch

| # | Effort | Description | Depends |
|---|---|---|---|
| Child A | 0.1d | Create 2 GitHub labels (`status:dormant`, `status:deferred`) via `gh label create` | — |
| Child B | 0.5d | Update `.github/workflows/label-lint.yml` with Epic-aware rule overrides (E1-E7) | Child A |
| Child C | 0.3d | Update `instructions/epic-governance.instructions.md` with state diagram + transition rules | — |
| Child D | 0.2d | Update `instructions/ticket-driven-work.instructions.md` taxonomy entries | — |
| **Total** | **~1.1d** | | |

Children B+C+D can ship in a single PR (small surface, all related). Child A is a one-shot CLI command that doesn't need a PR.

---

## Conclusion

The two-state addition (`dormant` + `deferred`) plus Epic-aware lint rules closes the governance gap without expanding the label taxonomy excessively. Migration of historical Epics is left to client review (no batch automation). The R&D-complete pseudo-state is intentionally not added — it's covered by `in-progress` with `role:manager` doing design work.
