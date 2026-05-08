# Claude Code Team — Position Log

Append-only. This team only.

---

## Kickoff entry

last_activity_utc: 2026-05-07T22:00:00Z
quiescent: false
status: active

Initial position: see [CC-RD] in `planning/artifacts/cc-rd.md`. Highlights:

- @-include claim correction `[CC-RD §0.2]` is the highest-leverage cross-team verification target.
- Effort estimate ~1.0d `[CC-RD §6.1]` may be optimistic on child #5 (CI drift-lint) — see also Consultant grade in #1105.
- G3-vs-G1 tradeoff `[CC-RD §6.2]` is a real operator decision, not a team decision.

Signed-by: Cole Mason (admin role for protocol)
Team&Model: claude-code:opus-4-7@anthropic
Role: manager

---
PROTOCOL_ACK: true
read:
  - planning/protocol.md
  - planning/README.md
  - planning/artifacts/INDEX.md
  - planning/artifacts/cc-rd.md
  - planning/artifacts/cp-rd.md
  - planning/artifacts/cx-rd.md
  - planning/artifacts/cc-critique.md
  - planning/status.md
Signed-by: Orla Harper
Team&Model: claude-code:opus-4-7@anthropic
Role: collaborator
last_activity_utc: 2026-05-08T03:16:48Z
---
---
decision_ref: D-001
threads: []
verdict: agree
rationale: This team raised the @-include-claim correction; Codex independently verified at CLAUDE.md:10, AGENTS.md:5, .codex/AGENTS.md:9. Two-team independent verification established.
evidence:
  - cf:[CC-RD §0.2]
  - cf:[CX-RD sources] (independent verification by Codex)
  - repo: CLAUDE.md:10
  - repo: AGENTS.md:5
Signed-by: Orla Vale
Team&Model: claude-code:opus-4-7@anthropic
Role: consultant
last_activity_utc: 2026-05-08T03:16:48Z
quiescent: true
---
---
decision_ref: D-002
threads: []
verdict: agree
rationale: Wiki "Always-Loaded Surfaces" claim is factually wrong. CC + CX agree; CP did not verify but did not contradict. Single-file fix in wiki/concepts/harness-goals.md.
evidence:
  - cf:[CC-RD §2]
  - cf:[CX-RD C4]
  - repo: wiki/concepts/harness-goals.md:33
Signed-by: Orla Vale
Team&Model: claude-code:opus-4-7@anthropic
Role: consultant
last_activity_utc: 2026-05-08T03:16:48Z
quiescent: true
---
---
decision_ref: D-003
threads: []
verdict: agree
rationale: 3-way agreement that aggregated G1..G9 enforcement+evidence map is the main unmet value. Maps already exist as tables in CC-RD §4-§5; promote to wiki/concepts/harness-goal-controls.md.
evidence:
  - cf:[CC-RD §4]
  - cf:[CC-RD §5]
  - cf:[CP-RD seedmap]
  - cf:[CX-RD C6]
Signed-by: Orla Vale
Team&Model: claude-code:opus-4-7@anthropic
Role: consultant
last_activity_utc: 2026-05-08T03:16:48Z
quiescent: true
---
---
decision_ref: D-004
threads: []
verdict: agree
rationale: Codex's CX-RD C3 finding is correct — the phrasing implies Fleet is goal-priority #2, conflating cost-lane with goal-priority. Reword.
evidence:
  - cf:[CX-RD C3]
  - repo: instructions/global-task-router.instructions.md:3
  - repo: instructions/harness-goals.instructions.md:8
Signed-by: Orla Vale
Team&Model: claude-code:opus-4-7@anthropic
Role: consultant
last_activity_utc: 2026-05-08T03:16:48Z
quiescent: true
---
---
decision_ref: D-005
threads: []
verdict: agree
rationale: Spelling drift is low-risk but real. Normalize hooks/scripts/session_context.py:72 to "Zero Cost" to match canonical. Smaller change than documenting an exception.
evidence:
  - cf:[CX-RD C5]
  - repo: hooks/scripts/session_context.py:72
  - repo: instructions/harness-goals.instructions.md:8
Signed-by: Orla Vale
Team&Model: claude-code:opus-4-7@anthropic
Role: consultant
last_activity_utc: 2026-05-08T03:16:48Z
quiescent: true
---
---
decision_ref: D-006
threads: []
verdict: agree
rationale: Runtime-source parity (sync:codex, sync:claude, hamr:sync-verify) is required for cross-agent compatibility. Implementation rollout MUST include sync verification evidence.
evidence:
  - cf:[CX-RD C8]
  - repo: scripts/global/hamr-sync-verify.js:19
  - repo: AGENTS.md:44
Signed-by: Orla Vale
Team&Model: claude-code:opus-4-7@anthropic
Role: consultant
last_activity_utc: 2026-05-08T03:16:48Z
quiescent: true
---
---
decision_ref: D-007
threads: []
verdict: agree
rationale: Codex's caveat is essential — JSON is a generated/derived contract for linting, NOT a second canonical. Markdown remains normative. Endorse with caveat.
evidence:
  - cf:[CX-RD canon item 2]
  - cf:[CC-RD §3.2]
  - repo: instructions/harness-goals.instructions.md:1
Signed-by: Orla Vale
Team&Model: claude-code:opus-4-7@anthropic
Role: consultant
last_activity_utc: 2026-05-08T03:16:48Z
quiescent: true
---
---
decision_ref: D-008
threads: []
verdict: agree
rationale: Copilot's CP-RD finding is correct — role-baton-routing.instructions.md uses older "backlog/todo" vocabulary that drifted from current ticket-driven-work taxonomy v1.1. Reconcile.
evidence:
  - cf:[CP-RD conflicts]
  - repo: instructions/role-baton-routing.instructions.md:12
  - repo: instructions/ticket-driven-work.instructions.md:11
Signed-by: Orla Vale
Team&Model: claude-code:opus-4-7@anthropic
Role: consultant
last_activity_utc: 2026-05-08T03:16:48Z
quiescent: true
---
---
decision_ref: D-009
threads: []
verdict: agree
rationale: G1 (Governance) trumps G3 (Zero Cost) in canonical priority. Include via @-include OR equivalent (goal_lens.py-only with byte-identity CI lint). Implementation chooses cheapest equivalent.
evidence:
  - cf:[CC-RD §6.2]
  - cf:[CX-RD C2]
  - repo: instructions/harness-goals.instructions.md:8
  - repo: hooks/scripts/goal_lens.py:8
Signed-by: Orla Vale
Team&Model: claude-code:opus-4-7@anthropic
Role: consultant
last_activity_utc: 2026-05-08T03:16:48Z
quiescent: true
---
---
decision_ref: D-010
threads: []
verdict: disagree-not-blocking
rationale: This team's consultant note flagged 1.2d as tight; including D-006 (sync proof) and D-008 (role-baton drift) pushes closer to 1.5d. Acceptable as planning baseline; revise upward if scope grows.
evidence:
  - cf:[CC-RD §6.1]
  - cf:[CP-RD rollout]
  - cf:[CX-RD rollout]
Signed-by: Orla Vale
Team&Model: claude-code:opus-4-7@anthropic
Role: consultant
last_activity_utc: 2026-05-08T03:16:48Z
quiescent: true
---
---
PROPOSE_DECISION: D-011
title: CI drift-lint detecting priority-sentence drift across 6 goal-bearing surfaces
threads: []
rationale: Prevents regression after D-001..D-005 fixes ship. Lint compares canonical line in harness-goals.instructions.md against the 5 mirror surfaces (global-standards, goal_lens.py, .codex/AGENTS.md, .github/copilot-instructions.md, wiki/concepts/harness-goals.md). Advisory-first for 2 weeks; promote to hard gate after stable.
evidence:
  - cf:[CC-RD §6.1 child #5]
  - cf:[CX-RD C1] (Codex's "lint mirrors against contract" approach is equivalent)
verdict: agree
Signed-by: Orla Vale
Team&Model: claude-code:opus-4-7@anthropic
Role: consultant
last_activity_utc: 2026-05-08T03:16:48Z
quiescent: true
---
