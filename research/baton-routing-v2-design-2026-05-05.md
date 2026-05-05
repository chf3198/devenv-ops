# Baton Standard v2.0 — Design Research & Decisions

**Date:** 2026-05-05
**Epic:** #905 (Baton Standard v2.0 — GitHub Projects integration + typed collaborators)
**Parent context:** #866 (Karpathy LLM Wiki epic — governance analysis phase)
**Author:** Copilot (Manager role) · Model: Claude Sonnet 4.6

---

## 1. Research Trail

### 1.1 Trigger

During Epic #866 governance analysis, the v1.0 baton standard
(`instructions/role-baton-routing.instructions.md`) was critically analyzed
and found to have structural gaps. A full two-session design discussion
produced 10 confirmed findings, leading to this v2.0 redesign.

### 1.2 Primary Finding: Null-Role States in v1.0

The v1.0 status table left three states without a `role:*` owner:

| State      | v1.0 owner | Problem                                        |
|------------|------------|------------------------------------------------|
| `backlog`  | — (none)   | No accountability anchor; orphaned tickets     |
| `ready`    | — (none)   | Handoff emitted but role already removed       |
| `done`     | — (none)   | Closed tickets have no audit owner             |

**Resolution:** Adopt the RACI Accountable layer — Manager is the permanent
accountability anchor for backlog, done, and cancelled. Role labels track
**current active role** (Responsible), but Manager always holds Accountable.
The `role:*` field is overloaded to carry both; this is a known simplification.

### 1.3 GitHub Projects Research (docs.github.com, May 2026)

**Built-in automations confirmed available:**
- Issue opened/added → Status: Todo (configurable)
- PR opened (linked to issue) → Status: In Progress
- Issue closed (completed) → Status: Done
- Issue closed (not planned) → Status: Done [= cancelled in our model]
- Auto-archive: `is:closed updated:<@today-30d`

**Key capability unlocked:** GitHub Projects v2 `Status` field is a custom
single-select that replaces label-only state tracking. Labels remain for
role ownership; Project field drives the board view.

**Authentication note:** `createProjectV2` requires the `project` OAuth
scope. User project creation requires the viewer's node ID
(`U_kgDOAFKhvg`), not the legacy base64 ID.

**Project created:** DevEnv Ops Board #3
`https://github.com/users/chf3198/projects/3`

### 1.4 Multi-Collaborator Model Research

**Problem with single `role:collaborator`:** As the fleet grows to include
models with distinct capability profiles (reasoning models vs. coding models
vs. ops models), a single collaborator label provides no routing signal.

**Pattern adopted from Linear.app and Jira:** Typed assignee roles with
WIP limits per type. Each collaborator type can have N `todo` tickets but
at most 1 `in-progress`. This prevents context-switching penalties and
enforces focus.

**Collaborator types defined (capability-based):**
- `role:collab-analyst` — Claude Opus/o3 tier; research, wiki surgery
- `role:collab-coder` — Claude Sonnet/GPT-4.1 tier; implementation
- `role:collab-architect` — Claude Opus; design docs, ADRs
- `role:collab-ops` — Codex/Gemini; config, deploy, CI

### 1.5 Research Lane Redefinition

**v1.0 problem:** The `docs/research` lane skipped Collaborator entirely
(Manager → Consultant). But research tickets (e.g., #864, #868–#872)
require substantive analytical work that is Collaborator-class effort —
just without a git branch.

**v2.0 resolution:** Research lane = Manager→Collab(analyst)→Admin→Consultant.
The Admin role shifts from CI gate reviewer to document quality reviewer.
The `COLLABORATOR_HANDOFF` artifact = detailed findings document posted
as issue comment. Admin reviews completeness before Consultant closeout.

### 1.6 `triage` and `ready` States — Elimination Rationale

**`triage`:** Examined all prior usage. `triage` was always Manager work
done inside `backlog`. No distinct artifact boundary existed between them.
The state added cognitive overhead without adding observable governance value.
**Decision:** Eliminate `triage`; Manager scoping happens inside `backlog`.

**`ready`:** Created a paradox: MANAGER_HANDOFF was emitted (handoff thrown)
but `role:manager` was removed, leaving the ticket owner-less. In a
single-agent system, "awaiting collaborator pickup" is instantaneous.
The `todo` state is a cleaner replacement — it means "collab assigned and
queued, not yet started," which is observable and meaningful for WIP tracking.
**Decision:** Eliminate `ready`; replace with `todo` (which already had a
GitHub label, confirming the ecosystem consensus on this state name).

### 1.7 Closed-State Rule Reversal

**v1.0 rule:** "Closed tickets must not retain execution-role labels."
**v2.0 rule:** Closed tickets retain `role:manager`.

**Rationale:** The v1.0 rule was designed to keep the baton view clean.
But it achieved that by destroying accountability metadata. The correct
solution is a filtered view (Baton View = open issues in
`status:todo,in-progress,testing,review`) rather than label deletion.
Closed tickets with `role:manager` support audit queries like "all work
completed by this team" and identify the accountability anchor for
post-mortems.

### 1.8 Archival System Design

**Problem:** Unlimited closed tickets with `role:manager` would inflate
manager label counts over time.

**Two-tier solution:**
1. **GitHub Projects auto-archive** (built-in): `is:closed updated:<@today-30d`
   — removes from all project views automatically, no Action needed
2. **Nightly Action** (to be built): swap `role:manager` → `role:archived`
   on issues closed >30 days — reduces label query noise for active work

The `role:archived` label was created in this epic. The nightly Action
is deferred to a follow-up ticket.

---

## 2. Design Decisions Log

| # | Decision | Rationale | Alternative Considered |
|---|----------|-----------|------------------------|
| D1 | Drop `triage` state | No artifact boundary; Manager work done in `backlog` | Keep as explicit scoping phase |
| D2 | Drop `ready` state | Paradox: handoff thrown but no owner; single-agent instantaneous | Add `COLLABORATOR_ACCEPT` artifact |
| D3 | `role:*` never null | Accountability invariant; audit completeness | Null OK for terminal states |
| D4 | `done` → `role:manager` | Manager is accountability anchor; view filtering handles noise | Strip all roles on close (v1.0) |
| D5 | Typed collaborators | Routing signal for capability-based assignment; WIP limits | Single `role:collaborator` |
| D6 | Research lane: Collab+Admin | Research is Collaborator-class effort; Admin = doc reviewer | Manager→Consultant direct |
| D7 | GitHub Projects for status | Native automation, board views, archival — best-in-class | Labels only |
| D8 | `todo` replaces `ready` | Observable "assigned not started" state; ecosystem standard name | Keep `ready` with new artifact |
| D9 | Manager out-of-band authority | Ticket health, AC edits, cancellation require no baton workflow | Manager scoped to `backlog`/`triage` only |
| D10 | `role:archived` after 30d | Reduce label noise; preserve accountability metadata | Delete closed ticket labels |

---

## 3. Governance Impact Assessment

### Files Changed
- `instructions/role-baton-routing.instructions.md` — rewritten v1.0 → v2.0 (83 lines, under 100)

### Labels Created
- `role:collab-analyst`, `role:collab-coder`, `role:collab-architect`, `role:collab-ops`
- `role:archived`

### Labels Deprecated (kept for backward compat, no new tickets)
- `role:collaborator` — superseded by typed labels
- `status:triage`, `status:ready` — superseded by `status:backlog` and `status:todo`

### Tickets Migrated
- #868–#872: `status:backlog + role:manager` → `MANAGER_HANDOFF` emitted → `status:todo + role:collab-analyst`

### GitHub Project Created
- DevEnv Ops Board #3 with custom fields: Status (7 states), Collab Type, Lane, Role
- Repo `chf3198/megingjord-harness` linked

---

## 4. Remaining Work (Deferred)

| Item | Ticket |
|------|--------|
| Nightly Action: swap role:manager → role:archived (closed >30d) | Follow-up on #905 |
| GitHub Actions workflow: auto-update Project Status on label changes | Follow-up on #905 |
| WIP limit enforcement Action: block todo→in-progress if collab has 1 in-progress | Follow-up on #905 |
| Update `baton-gates.yml` to validate new typed collab labels | Follow-up on #905 |
| Migrate Epic #866 and #905 themselves to v2.0 label/status model | In-progress |
| Add evidence citations to #870 and #871 bodies (confirmed gap from prior analysis) | Stand-alone |
| Add cross-ticket dependency DAG to Epic #866 | Stand-alone |

---

## 5. v1.0 → v2.0 State Mapping

```
v1.0 State    v2.0 State     Notes
──────────────────────────────────────────────────
backlog       backlog        + role:manager added
triage        (eliminated)   work done in backlog
ready         (eliminated)   replaced by todo
in-progress   in-progress    role:collab-{type} replaces role:collaborator
testing       testing        unchanged
review        review         unchanged
done          done           + role:manager on close (was null)
cancelled     cancelled      + role:manager always (was null)
```
