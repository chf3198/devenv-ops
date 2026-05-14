# Incident #1539 — node_modules self-symlink cross-team cascade

**Date:** 2026-05-14
**Severity:** P1 (cross-team blocker)
**Author:** Claude Code Team Collaborator (Orla Harper)
**Resolution method:** filesystem repair (no PR — direct rm/mv/ln-s operations)
**Audit artifact:** this document satisfies Copilot Team review note that #1539's closure lacked PR-linked evidence.

## Timeline

```
T+0     2026-05-14 ~06:38 UTC   #1279 pre-push hook silently fails
                                npm format:check loses stderr; symlink
                                resolution returns "Too many levels"

T+~5m   triage: ls -la node_modules in every worktree
                                discovers main's node_modules is
                                /devenv-ops/node_modules → self

T+~6m   apply workaround on my worktree
                                rm node_modules
                                ln -s devenv-ops-claude-code/node_modules
                                (non-canonical, but unblocks #1279)

T+~10m  #1279 ships (PR #1538 merged)

T+~12m  post-ship audit sweep finds blast radius
                                7 codex worktrees + locked auto-worktree
                                all broken (chained to main's self-link)

T+~15m  file P1 #1539 (this incident)
        file P2 #1540 (bootstrap script gap)
        file P2 #1541 (post-merge race)
        append 3 Tier-1/2 incident events to ~/.megingjord/incidents.jsonl

T+~18m  execute fix
                                STEP 1: verify donor (claude-code) has
                                        real node_modules with prettier
                                STEP 2: rm /devenv-ops/node_modules
                                        (broken self-link)
                                STEP 3: mv devenv-ops-claude-code/
                                        node_modules → /devenv-ops/
                                        node_modules (atomic rename,
                                        same filesystem)
                                STEP 4: ln -s /devenv-ops/node_modules
                                        devenv-ops-claude-code/
                                        node_modules (canonical link)
                                STEP 5: re-run worktree-bootstrap
                                        (no-op; symlinks already point
                                        at the now-real main path)
                                STEP 6: restore cc-1308 to canonical

T+~22m  verification across all worktrees passes
        all 7 codex + locked auto-worktree unblocked
        close #1539 with COLLABORATOR_HANDOFF evidence
```

## Root cause

A worktree at some point ran `npm install` from inside main's checkout while main's `node_modules` was already a symlink (likely pointing somewhere else). The install's behavior on a symlinked target depends on npm version + OS — the observed end state is a self-referential symlink, which is "successful" from the kernel's view (the syscall succeeds) but unusable in practice.

The `worktree-bootstrap-node-modules.sh` script (`#1378`) has no defense against this. Its check:

```bash
if [[ -z "$main_root" || ! -d "$main_root/node_modules" ]]; then
  log "node_modules bootstrap: no main checkout node_modules found at $main_root; skipping"
  return 0
fi
```

The `-d` test follows symlinks. A self-referential symlink resolves enough for `-d` to return true, so the script proceeds and chains the broken link into every subsequent worktree. **This is filed as #1540 (bootstrap script lacks self-symlink sanity check).**

## Blast radius (verified before + after)

```
                      Before                 After
+---------------------+----------------------+----------------------+
| Path                |                      |                      |
+---------------------+----------------------+----------------------+
| /devenv-ops         | SELF-SYMLINK         | real dir (53MB)      |
| /devenv-ops-cc-1308 | workaround           | → main (canonical)   |
| /devenv-ops-claude- | real dir (donor)     | → main (canonical)   |
|   code              |                      |                      |
| /devenv-ops-codex   | own real dir         | own real dir         |
| /devenv-ops-codex-* | broken chain         | → main (canonical)   |
|   (×6: 1476/1481/   |                      |                      |
|    1482/1483/1485/  |                      |                      |
|    1523)            |                      |                      |
| /devenv-ops-copilot | own real dir         | own real dir         |
| .claude/worktrees/  | broken chain         | → main (canonical)   |
|   agent-aabc        |                      |                      |
+---------------------+----------------------+----------------------+
```

All previously-broken worktrees now resolve correctly. Verified via:

```bash
/home/curtisfranks/devenv-ops-codex-1523/node_modules/.bin/prettier --version  # 3.8.3
/home/curtisfranks/devenv-ops/.claude/worktrees/agent-aabc060d7cbc65f74/node_modules/.bin/prettier --version  # 3.8.3
```

## Why no PR

The repair sequence was four filesystem operations (`rm`, `mv`, `ln -s`, re-run-script). None of these can be expressed as repo diff. The bootstrap script itself is correct as-deployed; the data state was the bug.

The follow-up #1540 (bootstrap-script sanity check) WILL ship as a PR — adding a self-symlink guard to the script would have prevented the cascade.

## Cross-team impact

Both Codex Team and Claude Code Team's locked auto-worktree were unblocked **without any team coordination needed** because:

- The fix restored the canonical state expected by the bootstrap script.
- Codex's downstream symlinks (`devenv-ops-codex-1523/node_modules → /devenv-ops/node_modules`) became functional automatically once main's path resolved to a real dir.
- No deps were installed or upgraded — the existing dependency tree from `devenv-ops-claude-code/node_modules` was relocated, not regenerated. Same lockfile, same versions.

## Self-annealing record

```
~/.megingjord/incidents.jsonl entries:
  pattern_id: main-node-modules-self-symlink         tier=1  severity=high   → #1539
  pattern_id: worktree-bootstrap-missing-sanity-check tier=1  severity=medium → #1540
  pattern_id: post-merge-automation-overrides-       tier=2  severity=medium → #1541
              label-lint                                   (count=4 across
                                                            #1279/#1374/#1521/#1536)
```

## Memory update

`feedback_worktree_symlink_validation.md` added under `~/.claude/projects/-home-curtisfranks-devenv-ops/memory/` so future sessions check `ls -la node_modules` across worktrees BEFORE rerunning a failed npm command.

## Out of scope

- Per-issue bisect of when main's self-symlink was created (data state, not code state).
- Migrating Codex/Copilot sandbox worktrees onto the canonical symlink (low priority — they work today with independent real dirs).
- Cross-host generalization of the bootstrap script (single-host context only for now).

## References

- #1539 — this incident (closed)
- #1540 — bootstrap script sanity-check gap (open, follow-up)
- #1541 — post-merge-automation race (open, follow-up)
- #1378 — original worktree-bootstrap-node-modules.sh
- `~/.megingjord/incidents.jsonl` — Tier-1/2 audit trail
- `~/.claude/projects/-home-curtisfranks-devenv-ops/memory/feedback_worktree_symlink_validation.md`

---

Signed-by: Orla Harper
Team&Model: claude-code:opus-4-7@anthropic
Role: collaborator
