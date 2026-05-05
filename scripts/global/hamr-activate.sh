#!/usr/bin/env bash
# hamr-activate.sh — HAMR Wave 7 child D (#954).
# One-shot: install git hooks (#934) + cron (#953); check env; print next-step hints.
# Each team runs this once per checkout.
set -euo pipefail

repo_root=$(git rev-parse --show-toplevel)
echo "▶ HAMR activation for: $repo_root"

step() { echo ""; echo "── $1 ──"; }

step "1/5 install R9.2 git hooks (#934)"
bash "$repo_root/scripts/global/install-hooks.sh"

step "2/5 install 6h periodic-push cron (#953)"
if command -v crontab >/dev/null 2>&1; then
  bash "$repo_root/scripts/global/install-cron.sh" || echo "⚠ cron install failed; manual: crontab -e"
else
  echo "⏭ crontab not available — skipping (run hamr-periodic-push.sh manually)"
fi

step "3/5 check operator key + Anthropic API key"
missing=()
[ -z "${OPERATOR_KEY_SEED_B64:-}" ] && [ ! -f "${HOME}/.megingjord/keys/operator-ed25519.pem" ] && missing+=(OPERATOR_KEY_SEED_B64)
[ -z "${ANTHROPIC_API_KEY:-}" ] && missing+=(ANTHROPIC_API_KEY)
if [ "${#missing[@]}" -eq 0 ]; then
  echo "✅ all required env present"
else
  echo "⚠ missing env: ${missing[*]}"
  echo "   set in .env or shell profile; HAMR Worker push will skip until set"
fi

step "4/5 verify Worker reachable"
url="${HAMR_URL:-https://hamr.chf3198.workers.dev}"
if curl -sf -o /dev/null "$url/healthz"; then
  echo "✅ Worker /healthz reachable: $url"
else
  echo "⚠ Worker unreachable at $url — set MEGINGJORD_HAMR_DISABLED=1 if intentional"
fi

step "5/5 write per-team opt-in marker"
team="${HAMR_TEAM:-claude-code}"
case "$team" in
  claude-code) cfg_dir="$HOME/.claude" ;;
  copilot)     cfg_dir="$HOME/.copilot" ;;
  codex)       cfg_dir="$HOME/.codex/devenv-ops" ;;
  *)           echo "⚠ unknown HAMR_TEAM=$team; skipping marker"; cfg_dir="" ;;
esac
if [ -n "$cfg_dir" ]; then
  mkdir -p "$cfg_dir"
  printf '{"enabled": true, "activated_at": "%s", "activated_by": "%s", "team_runtime": "%s"}\n' \
    "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$team" "$cfg_dir" > "$cfg_dir/hamr-config.json"
  echo "✅ wrote $cfg_dir/hamr-config.json"
fi

echo ""
echo "▶ HAMR activation complete."
echo "   smoke test:  npx playwright test tests/hamr-team-integration.spec.js"
echo "   sync verify: npm run hamr:sync-verify"
echo "   disable:     export MEGINGJORD_HAMR_DISABLED=1"
