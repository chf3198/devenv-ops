#!/usr/bin/env bash
# Retroactive node_modules bootstrap for ALL existing worktrees (#1378 AC3).
# Idempotent — skips worktrees that already have node_modules.
set -euo pipefail

log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"; }

main_root="$(git worktree list --porcelain | awk '/^worktree /{print $2; exit}')"
if [[ -z "$main_root" || ! -d "$main_root/node_modules" ]]; then
  log "ERROR: main checkout node_modules not found at $main_root"
  log "       run 'npm install' in $main_root first"
  exit 1
fi

linked=0
skipped=0
errored=0

# iterate every worktree path; skip the main one.
while IFS= read -r line; do
  if [[ "$line" =~ ^worktree[[:space:]](.+)$ ]]; then
    wt="${BASH_REMATCH[1]}"
    if [[ "$wt" == "$main_root" ]]; then
      continue
    fi
    if [[ ! -d "$wt" ]]; then
      log "WARN: worktree path missing on disk: $wt"
      errored=$((errored+1))
      continue
    fi
    if [[ -e "$wt/node_modules" ]]; then
      log "skip  $wt (already has node_modules)"
      skipped=$((skipped+1))
      continue
    fi
    ln -sf "$main_root/node_modules" "$wt/node_modules"
    log "link  $wt/node_modules → $main_root/node_modules"
    linked=$((linked+1))
  fi
done < <(git worktree list --porcelain)

log "done: linked=$linked skipped=$skipped errored=$errored"
