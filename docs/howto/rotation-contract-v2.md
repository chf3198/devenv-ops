# Rotation Contract v2 — Schema + Semantics (#1719)

Formal contract for Epic #1716 model-rotation rules. Supersedes #1572
critical-path-only diversity check; adds within-role rotation + strict
cross-family Admin + fully-independent Consultant.

## Family definition

`family` is the `team` portion of the `Team&Model` string format
`team:model@substrate`. Cross-team-within-provider (e.g.
`claude-code:opus` vs `claude-code:sonnet`) is the **same family** because
the `team` field matches. Cross-family means different `team` values
(e.g. `claude-code:opus` vs `codex:gpt-5`).

This definition is concrete and machine-verifiable; no judgment about
"how different" two models are.

## The 3 rules

```json
{
  "rotation_rules_v2": {
    "version": "2.0.0",
    "rule_1_collab_self_review": {
      "trigger": "COLLABORATOR_SELF_CHECK artifact emitted",
      "constraint": "self_check.team != implementation.team",
      "enforcement_tier": "advisory_then_required"
    },
    "rule_2_admin_diversity": {
      "trigger": "ADMIN_HANDOFF artifact emitted",
      "constraint": "admin.team NOT IN [collaborator.team, manager.team]",
      "enforcement_tier": "advisory_then_required"
    },
    "rule_3_consultant_independent": {
      "trigger": "CONSULTANT_CLOSEOUT artifact emitted",
      "constraint": "consultant.team NOT IN [manager.team, collaborator.team, admin.team]",
      "enforcement_tier": "advisory_then_required"
    }
  }
}
```

## Verification artifact format

Each baton artifact already declares `Team&Model: team:model@substrate`.
The validator computes the `team` set per role across the ticket and
checks the 3 rule constraints.

## Waiver semantics

Two waivers are accepted, with different visibility:

- **`model-diversity:waived` label** (existing #1572 waiver): continues to
  work during the Phase 4 advisory soak. Soft waiver; PR comment posted
  but no block.
- **`rotation-required-waived` label** (NEW for v2 required mode):
  required-mode waiver. Must be paired with a `WAIVER_RATIONALE` comment
  signed by the operator declaring `Team&Model` and reason.

Single-model-fleet operators per #1722 fallback spec are exempt from
both waiver requirements; their classification covers the exemption.

## Superseding #1572 — what changes vs what composes

| Aspect | #1572 (existing) | This contract v2 |
|---|---|---|
| Scope | Critical-path only (Admin, Consultant) | All 4 roles |
| Within-role review | Not addressed | Rule 1 covers it |
| Family definition | Implicit | Explicit (team field) |
| Enforcement | Advisory only | Advisory → required after soak |
| Waiver | `model-diversity:waived` label | Both labels supported |

**#1572 continues to run in parallel during the Phase 3-4 soak.** The two
emit overlapping but non-conflicting comments; #1572 covers AC-3 of Epic
#1568, while v2 covers all 3 rules. If both pass: no comments. If only
#1572 fails: #1572-style comment. If v2 fails but #1572 passes: v2 comment.
Both advisory until Phase 4 promotion.

## Validator input format

Phase 2.2 (HAMR-side) and Phase 3.1 (helper extension) consume identical
schema:

```json
{
  "ticket_number": 1234,
  "roles_observed": {
    "manager":       { "team": "claude-code", "model": "opus-4-7", "substrate": "anthropic" },
    "collaborator":  { "team": "claude-code", "model": "opus-4-7", "substrate": "anthropic" },
    "admin":         { "team": "codex",       "model": "gpt-5",    "substrate": "openai-compatible" },
    "consultant":    { "team": "copilot",     "model": "opus",     "substrate": "github-copilot" }
  },
  "operator_mode": "strict-rotation" 
}
```

The validator output:

```json
{
  "rule_1_pass": true,
  "rule_2_pass": true,
  "rule_3_pass": true,
  "violations": [],
  "operator_mode_honored": true,
  "advisory_or_required": "advisory"
}
```

## Out of scope of this contract

- Implementing the validator — Phase 3.
- HAMR-side enforcement mechanism — Phase 2.2.
- Crypto-signing requirement — Phase 2.3.

## Related

- Epic #1716, Phase 1.1 inventory (#1717), Phase 2.4 fallback (#1722)
- #1572 (existing critical-path advisory) — superseded comment posted
- #1568 (model-diversity Epic — closed; spec extension)
