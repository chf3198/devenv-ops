#!/usr/bin/env bash
# install-hooks.sh — HAMR Wave 5 child 3 (#934).
# Idempotent installer for the v3.2.2 §R9.2 git hook bundle.
# Symlinks scripts/hooks/* into .git/hooks/* so the repo's R9.2 enforcement is active.
set -euo pipefail

repo_root=$(git rev-parse --show-toplevel)
hooks_src="$repo_root/scripts/hooks"
hooks_dst="$repo_root/.git/hooks"
mkdir -p "$hooks_dst"

install_hook() {
  local name=$1
  local target=$2
  local src="$hooks_src/$target"
  local dst="$hooks_dst/$name"
  if [ ! -f "$src" ]; then
    echo "❌ missing source hook: $src"
    return 1
  fi
  chmod +x "$src"
  # If dst exists and is the existing readability hook, chain by appending invocation.
  if [ -f "$dst" ] && [ ! -L "$dst" ]; then
    if grep -q "$target" "$dst" 2>/dev/null; then
      echo "✅ $name already chains $target"
      return 0
    fi
    echo "" >> "$dst"
    echo "# Appended by install-hooks.sh (#934) — R9.2 enforcement" >> "$dst"
    echo "\"$src\" \"\$@\"" >> "$dst"
    echo "✅ $name extended with $target"
    return 0
  fi
  ln -sf "$src" "$dst"
  echo "✅ symlinked $name → $target"
}

install_hook pre-push pre-push-branch-check.sh
# branch-ops-audit.sh is multi-purpose; chain it under both event names.
install_hook_audit() {
  local name=$1
  local dst="$hooks_dst/$name"
  if [ -f "$dst" ] && grep -q branch-ops-audit "$dst" 2>/dev/null; then
    echo "✅ $name already chains branch-ops-audit.sh"
    return 0
  fi
  cat > "$dst" <<EOF
#!/usr/bin/env bash
"$hooks_src/branch-ops-audit.sh" $name "\$@"
EOF
  chmod +x "$dst"
  echo "✅ wrote $name wrapper"
}
install_hook_audit post-checkout
install_hook_audit post-commit

echo "R9.2 hooks installed at $hooks_dst — audit log at ~/.megingjord/branch-ops-audit.log"
