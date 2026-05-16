# Rotation G5 Portability Fallback (#1722)

Formal G5 fallback spec for operators who cannot satisfy Epic #1716
rotation rules with their available models. Consumes Phase 1.1
inventory output (#1717).

## Three operator-side modes

| Mode | Auto-detection criteria | Behavior |
|---|---|---|
| **strict-rotation** | 4+ distinct families available at activation | All 3 rules enforced after Phase 4 promotion |
| **advisory-only** | 2-3 distinct families available | Rules 1, 2 advisory; Rule 3 (Consultant fully independent) downgraded to advisory always |
| **single-model-fleet** | 1 family OR operator-declared | All rules skipped; alias-only artifacts; operator accepts bias risk |

## Auto-detection logic

At `npm run hamr:activate` time:

```js
function detectRotationMode(env) {
  const families = enumerateAvailableFamilies(env);
  if (families.length >= 4) return 'strict-rotation';
  if (families.length >= 2) return 'advisory-only';
  return 'single-model-fleet';
}

function enumerateAvailableFamilies(env) {
  const families = new Set();
  if (env.ANTHROPIC_API_KEY) families.add('anthropic');
  if (env.OPENAI_API_KEY) families.add('openai');
  if (env.GITHUB_COPILOT_TOKEN) families.add('copilot');
  if (ollamaIsReachable()) families.add('openclaw');
  if (env.OPENROUTER_API_KEY) families.add('openrouter'); // aggregator counts as separate path
  return [...families];
}
```

Result persisted to `~/.megingjord/activation.json`:

```json
{
  "timestamp": "2026-05-16T05:00:00Z",
  "detected_mode": "advisory-only",
  "available_families": ["anthropic", "openclaw"],
  "operator_override": null
}
```

## Explicit opt-out

`MEGINGJORD_MODEL_ROTATION_DISABLED=1` (parity with HAMR/MCP opt-out
patterns).

When set:
- Operator declared they do not participate in rotation enforcement.
- Validator emits an audit log entry per artifact but does not block
  or comment.
- `single-model-fleet` mode applies regardless of auto-detection.

## Self-classification artifact

When operator declares `single-model-fleet` (either via env var or by
having only 1 detected family), activation persists a signed declaration:

```json
{
  "timestamp": "2026-05-16T05:00:00Z",
  "classification": "single-model-fleet",
  "available_families": ["anthropic"],
  "operator_signature": "<ed25519 signature of timestamp+classification>",
  "consequences_acknowledged": true
}
```

The signature uses the operator's local signing key (per
`team-model-signatures.json`). Validator records this declaration for
later audit; if operator later switches to multi-family setup, mode
recalibrates at next `npm run hamr:activate`.

## Failover semantics

If a primary family becomes unavailable mid-session (provider 5xx,
quota exhausted, network outage):

1. **Soft failover**: rotation falls back to next-eligible family per
   the lane policy. Audit log records the failover.
2. **Hard failover**: if no eligible family remains, mode downgrades to
   `advisory-only` for the current session. Recovers at next activation.
3. **Total provider outage**: degrades to `single-model-fleet`; operator
   notified via dashboard panel.

## Operator-mode interaction with the 3 rules

| Mode | Rule 1 (self-review) | Rule 2 (Admin diversity) | Rule 3 (Consultant) |
|---|---|---|---|
| strict-rotation | required | required | required |
| advisory-only | advisory | advisory | always advisory (insufficient families) |
| single-model-fleet | skipped | skipped | skipped |

## Phase 1.1 inventory mapping

Per #1717: typical operator profile is single-family (subscription to
either Anthropic or OpenAI, not both). For these operators, mode is
auto-detected as `advisory-only` (if they also have local Ollama) or
`single-model-fleet`. **Cross-team baton flow is the strongest path
to strict-rotation** — when Claude Code, Codex, and Copilot teams all
participate on the same ticket, 3 families are guaranteed.

## Out of scope

- Implementing the auto-detection — Phase 3 (#1723/#1724).
- Provider-key acquisition support (operator's responsibility).
- Forcing operators into strict-rotation against their will.

## Related

- Epic #1716, #1717 (inventory), #1628 (G5 backing)
- `instructions/harness-goals.instructions.md` G5 contract
