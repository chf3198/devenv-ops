---
title: Cross-team governance surface inventory + contradiction analysis
type: research
created: 2026-05-17
status: active
ticket: 1606
---

# Cross-team governance surface inventory + contradiction analysis

## Purpose

Closes #1606 AC1 (inventory) and AC2 (contradictions) by enumerating every governance surface and identifying drift/overlap between runtime entry-point files.

## Surface inventory

### Top-level entry-point files (4)

| File | LoC | Purpose | Loaded by |
|---|---:|---|---|
| `AGENTS.md` | 79 | Generic AGENTS.md baseline | Cline, Continue, generic readers |
| `CLAUDE.md` | 42 | Claude Code memory entry | Claude Code session-start |
| `.github/copilot-instructions.md` | 99 | Copilot custom-instructions entry | VS Code Copilot |
| `.codex/AGENTS.md` | 15 | Codex project-doc baseline | Codex runtime |

### Canonical instruction tree (30 files)

Located at `instructions/*.instructions.md`. Provider-neutral; loaded by all runtimes via the adapter emission layer.

Key files (P1 priority per manifest):
- `operator-identity-context`, `team-model-signing`, `role-baton-routing`
- `global-task-router`, `governance-controls`, `harness-goals`
- `canonical-governance-anti-duplication` (the SSoT contract from #1692)
- `provider-neutral-governance`, `hamr-routing`
- `epic-governance`, `ticket-driven-work`, `github-governance`, `feature-completion-governance`
- `workflow-resilience`, `release-docs-hygiene`, `observability`

Full list available via `ls instructions/*.md`.

### Skills (37 directories)

`skills/<name>/SKILL.md` — auto-indexed via `scripts/global/skill-views-derive.js`. Deployed to `~/.copilot/skills/` and `~/.agents/skills/`.

### Hooks (33 Python scripts)

`hooks/scripts/*.py` — pre-tool, stop, session-start handlers. Deployed to `~/.copilot/hooks/` and `~/.codex/devenv-ops/hooks/`.

### Codex-specific assets

`.codex/`: `AGENTS.md`, `config.toml`, `runtime.config.toml`, `runtime-hooks.json`, `runtime-rules/`. Deployed to `~/.codex/`.

### Generated adapter artifacts

`generated/governance-adapters/{copilot,cline,claude-code,continue}/` — emitted by `governance:adapters:emit` from `inventory/governance-manifest.sample.json`. Tracked in git; sync-checked by `governance:sync-check`.

## Contradiction analysis (AC2)

Comparing the 4 entry-point files line-by-line for invariant coverage and drift:

| Invariant | AGENTS.md | CLAUDE.md | copilot-instructions.md | .codex/AGENTS.md |
|---|:-:|:-:|:-:|:-:|
| Team&Model signing | ✓ | ✓ (via team-model-signing.instructions.md import) | ✓ | ✓ |
| Baton order (Manager→Collab→Admin→Consultant) | implicit | ✓ (via role-baton-routing) | ✓ | implicit |
| Ticket-first workflow | implicit | ✓ (via ticket-driven-work) | implicit | implicit |
| Dedicated worktree | ✓ | ✓ (concurrent session safety) | ✓ | implicit |
| HAMR routing | ✓ | ✓ (via hamr-routing) | ✓ | ✓ |
| Repo-as-SSoT | ✓ | implicit | ✓ | ✓ |

### Identified drift

1. **Baton order coverage uneven** — `AGENTS.md` and `.codex/AGENTS.md` rely on implicit reference rather than explicit baton-order text. Fixed by adding pointer to `governance/README.md`.

2. **Ticket-first not explicit in entry points** — Only `CLAUDE.md` cites `ticket-driven-work` directly. Other entry points rely on inheriting it via `instructions/`. Fixed by `governance/README.md` invariant section.

3. **No single entry point** — Before this work, each entry-point file enumerated rules independently. Resolved by `governance/README.md` as canonical pointer.

4. **Stale references** — `AGENTS.md` line 12 references "DevEnv Ops Harness" while harness was rebranded to Megingjord on 2026-04-29 (per `CLAUDE.md`). Captured as a follow-on hygiene item; not in #1606 scope.

5. **`.codex/AGENTS.md` deploys to runtime** — but `.codex/AGENTS.md` is also a development source. The deployment direction is unambiguous (repo → runtime), but the dual role is implicit. Resolved by `canonical-governance-anti-duplication.instructions.md` SSoT rule.

## Resolution architecture

The single-source + adapter pattern (#1692) was already implemented in this repo before #1606:

- Source-of-truth: `instructions/*.md` (30 files).
- Manifest: `inventory/governance-manifest.sample.json` (6 P1 units; expandable).
- Adapter emit: `scripts/global/governance-adapter-emit.js` (4 targets).
- Drift gate: `scripts/global/governance-sync-check.js`.

#1606 closes the gap by adding the **operator-facing contract entry point** (`governance/README.md`) and the **invariant-presence lint** (`scripts/global/cross-team-contract-check.js`) on top of that infrastructure.

## Recommended follow-ons (out of #1606 scope)

1. **Expand manifest** — current sample manifest covers 6 of 30 P1 instructions. Filing as follow-on to systematically include the rest.
2. **AGENTS.md DevEnv Ops → Megingjord refresh** — line 12 stale reference. Hygiene-only.
3. **`.codex/AGENTS.md` length** — only 15 lines; could expand to reach parity with `AGENTS.md` baseline.
4. **Adapter emission for `.codex/AGENTS.md`** — currently `targets` array doesn't include codex; the project-doc fallback works but is implicit. Consider adding codex as a first-class target.

## ACs satisfied

- AC1 (inventory): full enumeration above. ✓
- AC2 (contradictions): 5 drift findings; 3 resolved by #1606 deliverables, 2 filed as follow-ons. ✓
- AC3 (canonical contract): `governance/README.md` lands as single entry point. ✓
- AC4 (preserve invariants): 4 invariants explicit in `governance/README.md` and verified by lint. ✓
- AC5 (drift lint): `npm run governance:cross-team-check` + spec test. ✓

## References

- Architecture decision: #1692 (closed).
- Anti-duplication contract: `instructions/canonical-governance-anti-duplication.instructions.md`.
- Adapter emit: `scripts/global/governance-adapter-emit.js`.
- Sync check: `scripts/global/governance-sync-check.js`.
