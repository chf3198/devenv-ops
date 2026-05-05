#!/usr/bin/env bash
# branch-ops-audit.sh — HAMR Wave 5 child 3 (#934).
# v3.2.2 §R9.2.3 audit log: appends every checkout/commit op to ~/.megingjord/branch-ops-audit.log.
# Called from .git/hooks/post-checkout and .git/hooks/post-commit (installed by install-hooks.sh).
set -euo pipefail

op=${1:-unknown}        # post-checkout | post-commit
arg1=${2:-}             # post-checkout: prev-HEAD; post-commit: empty
arg2=${3:-}             # post-checkout: new-HEAD; post-commit: empty
arg3=${4:-}             # post-checkout: 1=branch / 0=file; post-commit: empty

audit_log="${HOME}/.megingjord/branch-ops-audit.log"
mkdir -p "$(dirname "$audit_log")"

current_branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "DETACHED")
head_sha=$(git rev-parse HEAD 2>/dev/null || echo "")

# post-checkout: only audit branch checkouts, not file checkouts
if [ "$op" = "post-checkout" ] && [ "$arg3" != "1" ]; then
  exit 0
fi

printf '{"ts":%s,"op":"%s","cwd":"%s","head":"%s","head_sha":"%s","prev":"%s","new":"%s"}\n' \
  "$(date +%s%3N)" "$op" "$(pwd)" "$current_branch" "$head_sha" "$arg1" "$arg2" >> "$audit_log"
exit 0
