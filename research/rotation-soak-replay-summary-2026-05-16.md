# #1727 Rotation Soak Replay Summary

Replaces the 14-day calendar soak with hours-bound replay evidence per Epic #1771.

## Replay parameters

- **Command**: `node scripts/global/soak-replay-runner.js 50`
- **Run timestamp**: 2026-05-16
- **PR sample**: last 50 closed PRs on `chf3198/megingjord-harness`
- **Validator**: `scripts/global/baton-team-model-v2.js` v2 helper, `operator_mode: advisory-only`

## Results

```json
{
  "total": 50,
  "skipped": 5,
  "evaluated": 45,
  "passes": 1,
  "violations": 44,
  "compliance_rate": "0.022",
  "rule_violations": {
    "rule_2_admin_diversity": 43,
    "rule_3_consultant_independent": 42
  }
}
```

**Compliance rate: 2.2%** (1 of 45 evaluated PRs would have passed strict-rotation).

## Interpretation

The rotation contract enforces cross-family rotation: Admin team ≠ Manager/Collaborator teams (Rule 2); Consultant team ≠ any prior role (Rule 3). The sampled PRs all share one operator (`claude-code:opus-4-7@anthropic` across all 4 roles) — by construction, Rules 2 and 3 fail for **every** single-operator PR.

This is not a bug in the contract; it is the contract working as designed. The contract is **architected for multi-operator cross-team fleets**, not single-operator deployments.

## Promotion decision

**DECISION: do NOT promote to enforcing-mode in this repo's current state.**

Three options for #1727 closure:

1. **Back-off entirely** — recognize the rotation contract is structurally inapplicable to single-operator repos; close #1727 as "no-promotion; gate stays advisory-only indefinitely or until cross-team operation is active."

2. **Auto-detect single-family operators** — leverage existing v2 helper logic: when only one family detected at activation, mode auto-set to `single-model-fleet`, which skips all rotation checks (already implemented per #1722 spec). Close #1727 as "promotion conditional on multi-family activation."

3. **Re-architect the rotation contract** — change Rule 2 / Rule 3 from "team must differ" to "either team must differ OR operator-mode must be single-model-fleet OR within-family-different-version allowed." Phase 1 research already rejected within-family-different-version as too-weak; this option is governance-weakening.

**Recommended: Option 2** — the v2 helper already supports it; what's missing is the auto-detection at activation time + the operator-side declaration of mode. File a follow-on to wire activation-time mode detection.

## Composition with replay infrastructure

This summary closes #1727 in **hours instead of 14 days** (replay run took 30 seconds; analysis + decision <1h).

Total wall-time saved: ~14 days × 24 h × 3600 s = 1,209,600 s → replay = 30 s → **40,320× speedup**.

## Source evidence

Per-PR results: `/tmp/replay-output.json` (33 KB; full violation breakdown per PR available at replay re-run).

## Sources

- Epic #1771 (replay-based eval gates)
- Epic #1716 (rotation contract)
- #1727 (the 14-day soak this replaces)
- #1722 (G5 fallback spec — option 2 builds on this)
- `scripts/global/baton-team-model-v2.js` (the validator under test)
- `scripts/global/soak-replay-runner.js` (the replay runner)
