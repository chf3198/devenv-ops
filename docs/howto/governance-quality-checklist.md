# Governance Quality Checklist

> Operator-facing checklist for filing and closing high-quality tickets.
> Applies to all baton artifacts: MANAGER_HANDOFF, COLLABORATOR_HANDOFF,
> ADMIN_HANDOFF, CONSULTANT_CLOSEOUT. Enforced by megalint validators.

## Before filing a ticket (Manager)

- [ ] Title follows naming convention: `D-<epic>-NN: <verb> <noun>` for children, descriptive for Epics
- [ ] Body contains problem statement or objective (not blank)
- [ ] ACs are measurable and traceable — not aspirational prose
- [ ] Labels set: `type:`, `priority:`, `status:backlog`, `area:`, `lane:`
- [ ] Epic link present if this is a child ticket (`Parent: #N`)
- [ ] MANAGER_HANDOFF comment includes all 5 schema fields:
  - `scope:` — bounded description of what this ticket covers
  - `lane:` — one of `lane:code-change`, `lane:docs-research`, `lane:ops`, `lane:governance`
  - `test_strategy:` — one of `tdd-pyramid`, `golden-file`, `drift-lint`, `none` (with justification)
  - `acceptance:` — list of ACs from ticket body
  - `gates:` — comma-separated list of required gates
- [ ] `Signed-by:` is a **worker alias** (not client identity `Curtis Franks`)
- [ ] `Team&Model:` present with `<team>:<model>@<substrate>` format
- [ ] `Role: manager`

## Before marking in-progress (Collaborator)

- [ ] COLLABORATOR_HANDOFF posted before first code commit
- [ ] Branch name follows `feat/<N>-<slug>` or `fix/<N>-<slug>` convention
- [ ] `Signed-by:` is collaborator worker alias (surname `Harper`)
- [ ] `Role: collaborator`

## Before requesting merge (Collaborator)

- [ ] All ACs checked off in ticket body
- [ ] Tests written and passing (per `test_strategy`)
- [ ] `npm run lint` clean (100-line cap honored for non-exempt paths)
- [ ] Changelog fragment added to `.changes/unreleased/<N>.md`
- [ ] Cross-links updated (Epic body refs child; child refs Epic)

## Before merging (Admin)

- [ ] CI checks green (or bypass logged with rationale)
- [ ] ADMIN_HANDOFF posted: scope, merge commit, verification evidence
- [ ] `Signed-by:` is admin worker alias (surname `Reyes`)
- [ ] `Role: admin`

## Before closing a ticket (Consultant)

- [ ] CONSULTANT_CLOSEOUT posted with:
  - Verification timestamp (ISO-8601)
  - G1-G9 goal rubric (one line per goal: MEETS / EXCEEDS / MISS + brief note)
  - Verdict: PASS / CONDITIONAL_PASS / FAIL
- [ ] All body AC checkboxes ticked
- [ ] `status:done` label applied (not just closed)
- [ ] `Signed-by:` is consultant worker alias (surname `Vale`)
- [ ] `Role: consultant`

## Epic-specific checks

- [ ] Child-ticket references in Epic body (`#N`) for each AC group
- [ ] Phase gate respected (R&D ticket closed before dev children created)
- [ ] Epic `status:in-progress` → `status:done` only after all children done
- [ ] Cross-team Consultant sign-off for Epic closure (per #1271 AC6)

## Quick alias reference

| Team | Manager | Collaborator | Admin | Consultant |
|---|---|---|---|---|
| claude-code | Cole Mason | Orla Harper | Nico Reyes | Iris Vale |
| copilot | Soren Mason | Maya Harper | Nico Reyes | Iris Vale |
| codex | Finn Mason | Rowan Harper | Nico Reyes | Iris Vale |

## Cross-references

- `instructions/team-model-signing.instructions.md` — full signing contract
- `instructions/role-baton-routing.instructions.md` — baton handoff rules
- `docs/howto/governance-backfill-runbook.md` — fixing historical violations
- `scripts/global/megalint/` — automated validators for all artifact types
