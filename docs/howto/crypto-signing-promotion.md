# Crypto-Signing Promotion Plan (#1721)

Promote `Crypto-Algorithm`, `Crypto-Key-Id`, `Crypto-Signature` baton-
artifact fields from **optional** to **default** (with opt-out). Consumes
the Phase 1.2 research (#1718) 3-tier trust model.

## Current state

- Fields specified in `instructions/team-model-signing.instructions.md`
  as **optional augmentation** to human-readable Signed-by/Team&Model.
- `inventory/team-model-signatures.json` `cryptoKeys` array contains
  ed25519 public keys for all 4 Copilot-team roles (`copilot-manager-v1`,
  `copilot-collaborator-v1`, `copilot-admin-v1`, `copilot-consultant-v1`).
- `scripts/global/governance-artifact-signature.js` provides
  `verifyArtifact()` consumer.
- `scripts/global/agent-signature.js` provides the signer side.

## Promotion timeline

| Phase | Duration | Behavior |
|---|---|---|
| 1 — soak | 30 days | `Crypto-*` fields encouraged but optional; CI emits advisory comment when missing |
| 2 — required-with-waiver | 14 days | Required default; `MEGINGJORD_CRYPTO_SIGNING_DISABLED=1` opt-out works without rationale |
| 3 — required-default | indefinite | Required default; opt-out requires structured rationale comment per artifact |

## Key generation per team

ed25519 keypair per `(team, role)` per `inventory/team-model-signatures.json`
`cryptoKeys` array. Teams needing bootstrap:

- `codex` team — 4 keys (Quill, Caden variants)
- `claude-code` team — 4 keys (Clio, Orla aliases)
- `openclaw` team — 4 keys (Quinn, Mira, Fia aliases)
- `copilot` team — already exists ✓

## Key rotation cadence

- **Routine rotation**: annual. Triggered by `npm run signing:rotate --team X --role Y`.
- **Emergency rotation**: on suspected compromise. Old keyId moves to
  revocation list within 24h.
- **Revocation list distribution**: appended to
  `inventory/team-model-signatures.json` as `revokedKeys` array;
  distributed via standard `git pull` mechanism.

## Operator UX

```bash
# Initialize signing keys (one-time per team)
npm run signing:bootstrap --team codex

# Rotate a specific role
npm run signing:rotate --team codex --role consultant --emergency=false

# Verify your local key matches the registry
npm run signing:verify --team codex --role consultant
```

Private keys stored at `~/.megingjord/keys/<team>-<role>.key` with `0600`
permissions. Never committed to repo.

## Single-point-of-failure containment

Per Gemma3:1b cross-family review signal (logged 2026-05-16):

### Per-key compromise containment

When a single `(team, role)` private key leaks:
- **Blast radius**: only artifacts signed with that keyId. Other roles
  and other teams unaffected.
- **Detection**: revocation-list update + grep for that keyId in
  historical baton artifacts produces the affected-set.
- **Remediation**: emergency rotation; re-sign affected pre-merge artifacts
  with new keyId; affected post-merge artifacts marked for manual review.

### Optional N-of-M multi-signature for Tier-1 operations

For the Phase 1.2 Tier-1 operations (cross-team PR merges, Epic close-outs,
required-mode promotion gates, Tier-3 anneal escalations):

- Artifact body MAY include `Crypto-Signature-2` field signed by a
  different (team, role) keypair.
- Validator MAY require 2-of-2 signatures when artifact carries a
  `Crypto-Multi-Sig-Required: true` field.
- This raises the bar against single-key compromise for the highest-
  trust operations.

This is **optional in Phase 3.3**; promotion to default for Tier-1
operations is a Phase 4+ decision based on operational evidence of
single-key compromise risk.

### Compromise-detection signal

Phase 4+: a daily sweeper checks for:
- Signatures from unexpected substrate (e.g., a `codex` team signature
  appearing on a `github-copilot` substrate artifact).
- Anomalous artifact emission timing for the keyId.
- Velocity anomalies (sudden burst of signatures from one keyId).

Detection produces a Tier-3 anneal escalation, not auto-revocation
(false-positive risk).

## Opt-out semantics

`MEGINGJORD_CRYPTO_SIGNING_DISABLED=1` — operator declares they cannot
participate in crypto-signing (e.g., key material not yet provisioned).

Skills falling back to alias-only artifacts MUST include a structured
rationale comment after Phase 2 (the required-with-waiver phase). Example:

```
CRYPTO_OPT_OUT_RATIONALE
operator: chf3198@example.com
reason: keys not yet bootstrapped for codex team
mitigation: pairs with cross-team consultant for high-trust ops
expected_resolution: 2026-05-30
```

## Compatibility with #1714 (conditional)

If #1714 lands option (a) (allow multi-Close batching), sibling-ticket
brief-evidence comments must also carry `Crypto-Signature` fields. If
option (b) (per-issue baton required), this compatibility AC is moot.

## Cites Phase 1.2 (#1718)

- 3-tier trust model adopted.
- Crypto-required tier (Tier 1) = cross-team-PR + Epic close + promotion gates.
- Crypto-default-with-fingerprinting tier (Tier 2) = standard baton.
- Optional tier (Tier 3) = trivial single-team work.

## Out of scope

- Implementing the bootstrap/rotate scripts — Phase 3.3 (#1725).
- Centralized key directory — keys remain per-team in
  `inventory/team-model-signatures.json`.
- Blockchain-based provenance — see #1718 evaluation; overkill for
  the harness's single-repo trust model.

## Related

- Epic #1716, #1718 (Phase 1.2 research), #1725 (Phase 3.3 implementation)
- `team-model-signing.instructions.md`, `governance-artifact-signature.js`
