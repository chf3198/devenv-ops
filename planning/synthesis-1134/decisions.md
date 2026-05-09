# Epic #1133 R&D Synthesis Decisions
Date: 2026-05-09

## Summary table
| Deliverable | Status | Decision |
| --- | --- | --- |
| Pattern catalog seed (>=10) | Complete | Keep 8 existing + add 4 high-signal patterns in Phase-C (token-scope drift, stale schedule actor, duplicate proposal replay, merge-queue check gap). |
| Detection mechanics | Complete | Keep nightly `schedule` baseline; add event-assisted `workflow_run` signal ingestion only for critical classes. |
| incidents schema | Complete | Extend current JSONL with `proposal_id`, `dedupe_key`, `action_taken`, `source_event`, `review_decision`. |
| Actuator matrix | Complete | Split to `notify-only`, `proposal-draft`, `auto-file-ticket` based on severity and recurrence. |
| Operator review UX | Complete | Keep CLI review loop; add deterministic suppression TTL and explicit reject reasons. |
| Integration matrix (#1113/#1125/#1112) | Partial | #1113 sensor path exists; #1125 edge publish and #1112 synthesis-watch still need child tickets. |
| Cross-team synthesis artifact | Complete | This file is canonical Phase-0 synthesis output for #1134. |
| Risk register | Complete | Noise fatigue, replay duplication, prompt-injection in evidence text, stale actor on schedules, idempotency drift. |

## Detailed findings with source links
- GitHub schedule trigger constraints require default branch presence, can be delayed/dropped at hour boundaries, and can silently stop if actor/account state changes. Source: https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#schedule (accessed 2026-05-09T18:28:00Z).
- Least-privilege `GITHUB_TOKEN` and explicit `permissions` remain mandatory for auto-ticket actuation. Source: https://docs.github.com/en/actions/security-for-github-actions/security-guides/automatic-token-authentication (accessed 2026-05-09T18:28:00Z).
- SRE guidance favors simple symptom-first alerts and anti-noise controls; this supports recurrence thresholds + suppression TTL over complex causal trees. Source: https://sre.google/sre-book/monitoring-distributed-systems/ (accessed 2026-05-09T18:28:00Z).
- ReAct and Reflexion reinforce using explicit reasoning+actions with episodic memory buffers; this maps to proposal drafts + review memory in incidents JSONL. Sources: https://arxiv.org/abs/2210.03629 and https://arxiv.org/abs/2303.11366 (accessed 2026-05-09T18:28:00Z).
- Karpathy Wiki local context confirms existing harness direction but lacks a current Phase-0 synthesis node for #1134. Sources: wiki/concepts/self-annealing.md, wiki/sources/global-governance-self-anneal-2026.md.

## Decision package (ready for implementation tickets)
1. Implement AC5 with deterministic auto-file template and `dedupe_key` guard.
2. Implement AC7 with suppression policy file (`reason`, `ttl_days`, `reviewer`, `created_utc`) and re-proposal blocker.
3. Implement AC9 integration path: publish detector outputs to governance-audit JSON and dashboard queue panel.
4. Add stale-schedule-actor health check to nightly workflow and emit warning issue when actor is invalid.
5. Add synthetic tests for threshold boundaries and replay/idempotency.

## Last-updated
2026-05-09T18:28:00Z

## Actionable Next Steps
- Open and sequence Phase-C tickets for AC5, AC7, AC9, and schedule-actor hardening.
- Link those tickets to #1133 and #1134, then transition #1134 to done when accepted.

Signed-by: Curtis Franks
Team&Model: copilot:gpt-5.3-codex@github
Role: consultant
