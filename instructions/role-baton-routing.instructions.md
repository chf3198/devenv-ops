---
name: Role Baton Routing
description: "v2.0 — Single-thread role handoff with GitHub Projects integration, typed collaborators, zero null-role states."
applyTo: "**"
---

# Role Baton Routing (v2.0)

The GitHub issue **is** the baton. One active role at a time. Every state carries exactly one
`role:*` label — no exceptions, including closed tickets.

Authoritative board: **DevEnv Ops Board** (GitHub Projects #3).
Baton view filter: `status:todo,in-progress,testing,review` (backlog/done/cancelled hidden).

## Status Workflow

```
Status        Role Label          Gate / Trigger
──────────────────────────────────────────────────────────────────────
backlog       role:manager        Manager creates + scopes; not yet pulled
todo          role:collab-{type}  MANAGER_HANDOFF emitted; collab assigned
in-progress   role:collab-{type}  Branch created OR first commit (Actions auto-detect)
testing       role:admin          COLLABORATOR_HANDOFF emitted; CI gates running
review        role:consultant     ADMIN_HANDOFF emitted; critique + closeout active
done          role:manager        CONSULTANT_CLOSEOUT emitted; closed; Manager re-applied
cancelled     role:manager        Manager closes as "not planned"; reason comment required
```

## Transition Guards

- `backlog → todo`: MANAGER_HANDOFF posted; swap `role:manager` → `role:collab-{type}`.
- `todo → in-progress`: Branch created; retain `role:collab-{type}`; GitHub Actions updates Status.
- `in-progress → testing`: COLLABORATOR_HANDOFF; all ACs ✅; swap to `role:admin`.
- `testing → review`: ADMIN_HANDOFF; all gates pass; swap to `role:consultant`.
- `review → done`: CONSULTANT_CLOSEOUT; swap `role:consultant` → `role:manager`; close issue.
- `any → cancelled`: Manager only — remove current `role:*`; apply `role:manager`; post
  `CANCELLATION: <reason>`; close as "not planned".
- Manager ticket-health checks, AC edits, and label fixes are out-of-band; no handoff required.

## Typed Collaborators

Type is selected at `backlog → todo`. Each type may queue N `todo` tickets but
**at most 1 `in-progress`** at a time (enforced by baton-gate Action).

| Label                  | Capability profile                        |
|------------------------|-------------------------------------------|
| role:collab-analyst    | Research, wiki surgery, doc analysis      |
| role:collab-coder      | Implementation, tests, refactoring        |
| role:collab-architect  | Design docs, ADRs, interface specs        |
| role:collab-ops        | Config, deploy, infra, CI changes         |

## Multi-Lane Definition of Done

| Lane         | Work type                      | Role sequence                     | N/A markers                    |
|--------------|--------------------------------|-----------------------------------|--------------------------------|
| code-change  | Code, infra, deploy (default)  | Manager→Collab→Admin→Consultant   | none                           |
| research     | Analysis, wiki — no git branch | Manager→Collab(analyst)→Admin→Consultant | Admin = doc reviewer, not CI |
| config-only  | Single-value config, no design | Manager→Admin→Consultant          | COLLABORATOR_HANDOFF: N/A      |

Lane set at ticket creation via `lane:*` label and `Lane` Project field. Default: **code-change**.

## Archival

Closed tickets retain `role:manager`. A nightly Action swaps `role:manager` → `role:archived`
on issues closed >30 days. Archived tickets are excluded from all dashboard and baton queries.

## Hard Rules

- `role:*` is never null — exactly one present at all times.
- No concurrent role execution on a single ticket.
- Emit the named handoff artifact before transitioning to the next role.
- All governed work requires a GitHub issue and `Refs #N` in the PR body.
- Skip baton only for: single Q&A, read-only lookup, no file edits, no state-changing tool calls.

## Local Override

A repo may override via `.github/copilot-instructions.md`; local wins on conflict.

## Skill Mapping

Manager: `role-manager-execution` | Collaborator: `role-collaborator-execution`
Admin: `role-admin-execution` | Consultant: `role-consultant-critique`
Orchestration: `role-baton-orchestrator`

