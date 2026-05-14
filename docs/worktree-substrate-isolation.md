# Worktree Substrate Isolation

VS Code can show every detected Git worktree as a separate Source Control
repository. In a three-team harness, that creates operator clutter and raises
the chance of committing, syncing, or deleting the wrong worktree.

## Target Layout

```text
~/devenv-ops/                          operator main checkout only
~/agent-workspaces/claude-code/...     Claude Code team substrate
~/agent-workspaces/copilot/...         Copilot team substrate
~/agent-workspaces/codex/...           Codex team substrate
```

Keep team worktrees outside the operator VS Code workspace. Merge through
GitHub PRs, not by sharing one live checkout.

## First-Pass Inventory

Run the read-only inventory before cleanup:

```bash
npm run governance:worktree-inventory -- --json
```

Actions are recommendations only:

| Action | Meaning |
|---|---|
| `keep-main` | Operator checkout. Leave visible. |
| `keep-active` | Clean unmerged branch. Keep until PR closes. |
| `keep-locked` | Another orchestrator owns it. Do not touch. |
| `review-dirty` | Contains local changes. Ask owner or create rescue branch. |
| `review-detached` | Detached HEAD needs manual classification. |
| `remove-after-merge` | Clean branch whose HEAD is merged to `origin/main`. |
| `prune-metadata` | Git says metadata is stale; use `git worktree prune`. |

## VS Code Declutter

For the operator workspace, prefer:

```json
{
  "scm.repositories.selectionMode": "single",
  "scm.alwaysShowRepositories": false,
  "git.confirmSync": true,
  "git.pruneOnFetch": true
}
```

These settings reduce accidental multi-repository SCM actions, but they do not
replace the inventory. Worktree deletion still requires explicit governance.

Signed-by: Quill Harper  
Team&Model: codex:gpt-5.4@local  
Role: collaborator
