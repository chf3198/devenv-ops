# Concurrent Agent Worktree Runbook

This repo can support parallel AI teams, but not from the same live checkout.

## Rules

- One live agent family per worktree.
- One active feature branch per worktree.
- Keep `/home/curtisfranks/devenv-ops` as the clean integration checkout.
- Merge work through PRs instead of letting agents share a branch.

## Recommended layout

- `/home/curtisfranks/devenv-ops` → clean `main` (integration checkout)
- `/home/curtisfranks/devenv-ops-codex` → Codex session
- `/home/curtisfranks/devenv-ops-copilot` → Copilot session
- `/home/curtisfranks/devenv-ops-claude-code` → Claude Code session
- `/home/curtisfranks/devenv-ops/.claude/worktrees/<auto>` → Claude Code SDK auto-worktree (locked; managed by SDK)
- `/home/curtisfranks/devenv-ops-rescue` → quarantined mixed state when a collision happens (transient)

## Canonical concurrent-worktree count (per #1439)

**Legitimate floor: 4-5 worktrees** (main + 3 team sandboxes + optional auto-managed SDK worktree). The `git-state-drift-sensor.js` `max_concurrent_worktrees` threshold is **5 by default** (env-overridable via `GIT_DRIFT_MAX_CONCURRENT_WORKTREES`). Counts ≤5 are normal; counts ≥6 indicate an unexpected extra and should be investigated. Session-feature-branch worktrees (e.g., `devenv-ops-cc-<N>`) are transient and may legitimately push the count above the floor while active — clean up at session end.

## Setup

```bash
git fetch origin
git worktree add -b sandbox/codex ../devenv-ops-codex origin/main
git worktree add -b sandbox/copilot ../devenv-ops-copilot origin/main
git worktree add -b sandbox/claude-code ../devenv-ops-claude-code origin/main
```

## Daily use

1. Open one VS Code window per worktree.
2. Start one agent family per window.
3. Reset launcher branch to `origin/main` before new work.
4. Create the task branch inside that agent's worktree only.
5. Merge reviewed work back through GitHub.

### Mandatory launcher reset

Use one command at session start:

```bash
bash scripts/worktree-session-start.sh <copilot|codex|claude-code> feat/<issue#>-<slug>
```

This command:

- fetches latest refs,
- hard-resets the sandbox launcher branch to `origin/main`,
- clears local residue,
- and switches to a ticket-linked task branch.

Do not commit directly on `sandbox/*` launcher branches.

## Recovery

1. `git stash push -u -m "recovery: concurrent-agent-collision"`
2. Create a rescue worktree from the current commit.
3. Apply the stash inside the rescue worktree.
4. Fast-forward the clean `main` checkout to `origin/main`.
