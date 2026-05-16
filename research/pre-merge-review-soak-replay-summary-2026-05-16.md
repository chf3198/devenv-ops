# #1756 Pre-Merge Review Soak Replay Summary

Replay-based evidence for Epic #1736 pre-merge-review gate per Epic #1771.

## Replay parameters

- **Run timestamp**: 2026-05-16
- **PR sample**: same 50 closed PRs from #1727 replay (path-glob trigger detection layer)
- **Adversarial fixture set**: 12 synthetic fixtures from `scripts/global/adversarial-fixture-gen.js`
- **Coverage**: trigger-detection layer (path-glob, file-pattern); does NOT exercise sub-agent LLM invocation (deferred to operator-side via HAMR deployment per #1727 day-0 declaration)

## Trigger-layer replay results

Trigger detection on 50 closed PRs' file lists (extracted via `gh pr view --json files`):

| Trigger category | PRs that would hit | False-positive risk |
|---|---|---|
| workflow-yaml-actions-change | 8 (from session's CI workflow edits) | Low — these are real CI security surface changes |
| auth-code-change | 0 | n/a — no auth code touched in this period |
| db-schema-migration | 0 | n/a |
| new-external-dependency | 2 (package-lock.json changes) | Medium — could be legitimate npm install |
| secret-credential-path | 0 | n/a |
| cryptographic-primitive | 1 (#1735 crypto-signing infrastructure) | Low — legitimately new crypto |
| permission-scope-expansion | 0 | n/a |
| test-deletion | 0 | n/a (only test additions in this period) |

Trigger-layer summary: **11 of 50 PRs** would have raised `high` severity findings from triggers alone. 9 of 11 are accurate (CI changes, new crypto); 2 are borderline (lockfile changes that may be benign npm-install regen).

## Adversarial fixture replay

All 12 synthetic fixtures from #1771 Child 3.2:

| Fixture | Expected | Outcome |
|---|---|---|
| auth-code-change-high | high | ✅ matches |
| db-schema-migration-high | high | ✅ matches |
| new-dep-package-lock-high | high | ✅ matches |
| patch-version-bump-low | medium | ✅ matches |
| secret-path-high | high | ✅ matches |
| workflow-yaml-actions-change-high | high | ✅ matches |
| workflow-yaml-trivial-low | low | ✅ matches |
| crypto-primitive-high | high | ✅ matches |
| permission-scope-expansion-high | high | ✅ matches |
| test-deletion-medium | medium | ✅ matches |
| whitelist-lockfile-checksum-only | no-trigger | ✅ matches |
| whitelist-auth-rename-no-logic | no-trigger | ✅ matches |

**12/12 adversarial fixtures produce expected severity.** Trigger matrix logic is sound.

## Sub-agent layer

Full sub-agent LLM invocation (bug-detect, security, test-coverage, architectural-drift) is not executed in this replay because:

1. Sub-agents require live LLM provider routing per Epic #1736 Phase 2.4 design (#1744).
2. HAMR `/mcp review:run` capability is shipped (PR #1767) but not deployed (`wrangler deploy` is operator-side).
3. Mock-only sub-agent fan-out doesn't produce realistic FP-rate signal.

Sub-agent-layer evaluation is deferred to **post-`wrangler-deploy` shadow mode** (Layer 4 of the 5-layer eval stack from #1772 research). This is a legitimate use case for shadow mode where replay cannot substitute.

## Interpretation

The pre-merge-review gate's **trigger detection layer** is validated by replay + adversarial fixtures. The **sub-agent layer** awaits operational deployment.

## Promotion decision

**DECISION: promote trigger-detection layer to advisory-mode immediately (already shipped); defer sub-agent layer to post-deployment shadow mode.**

Specifically:
- The advisory workflow (`.github/workflows/pre-merge-review.yml`) already posts trigger-based findings on PR-event.
- Operators with HAMR deployed can invoke sub-agents per existing wiring; output is advisory.
- Promotion to **enforcing mode** is deferred until shadow-mode evidence accumulates against the full sub-agent stack (estimated 50+ PRs with sub-agents running real).

## Composition with replay infrastructure

This summary closes #1756 in **hours instead of 14 days** for the trigger-layer decision. Sub-agent-layer decision still requires shadow mode but the calendar trap is removed — promotion is now metric-driven, not date-driven.

## Sources

- Epic #1771 (replay-based eval gates)
- Epic #1736 (pre-merge review)
- #1756 (the 14-day soak this replaces)
- #1738 #1743 (auto-escalate trigger matrix research + spec)
- `scripts/global/adversarial-fixture-gen.js` (12 fixtures)
