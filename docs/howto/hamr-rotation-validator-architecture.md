# HAMR-Side Rotation Validator Architecture (#1720)

Where the rotation validator lives, how HAMR accumulates per-ticket
state, and the API surface. Consumes the v2 contract from #1719.

## Validator location

**Decision**: HAMR-side `/mcp` capability dispatch (not separate worker).

Rationale:
- HAMR already tracks `Team&Model` per call via `hamr-provider-wrapper.js`.
- `/mcp` already supports capability dispatch (`bundle:fetch`,
  `doctor:probe`, `mailbox:read`).
- Adding `rotation:check` capability fits the existing namespace without
  spinning up another worker.

Alternative considered: separate Cloudflare worker. Rejected because
duplicates the per-call observation HAMR already does; would force
worker-to-worker calls for every artifact emission.

## HAMR per-ticket state observation

HAMR's existing wrapper records each call with `(ticket_number, role,
team_model)`. Phase 3.2 extension:

- Per-call hook appends `(role, team, model, substrate, timestamp)` to
  KV namespace `rotation-state:<ticket_number>`.
- KV value is a JSON array of role-team-model records, append-only
  during the ticket lifecycle.

## Storage surface

| Aspect | Choice |
|---|---|
| KV namespace | `rotation-state:<ticket_number>` |
| Schema | `{ records: [{role, team, model, substrate, ts}] }` |
| Retention | 30 days post-ticket-close, then deleted by daily sweeper |
| Size budget | <2KB per ticket (4 roles × ~500B each) |
| Read pattern | Single read per artifact emission |
| Write pattern | Single append per artifact emission |

## API surface

```
POST /mcp
{
  "capability": "rotation:check",
  "params": {
    "ticket_number": 1234,
    "proposed_role": "consultant",
    "proposed_team_model": "copilot:opus@github-copilot"
  }
}

Response:
{
  "decision": "pass" | "fail" | "advisory_violation",
  "rule_evaluated": "rule_3_consultant_independent",
  "violations": [],
  "operator_mode": "strict-rotation",
  "advisory_or_required": "advisory"
}
```

## Latency budget

| Path | p95 budget |
|---|---|
| Cold path (first ticket activity) | <500 ms |
| Warm path (subsequent artifacts) | <50 ms |
| KV read cost | <10 ms typical |
| Rule evaluation | <5 ms (pure function) |

These budgets stay below the HAMR `/quota` 300ms p95 baseline because the
rotation check piggybacks on existing wrapper calls; no net new latency
expected for hot path.

## Integration with `/quota`

The `/quota` endpoint reports rotation compliance metrics:
- `rotation.compliance_rate_7d`: % of tickets where all 3 rules passed
- `rotation.violation_count_7d`: per-rule violation totals
- `rotation.operator_mode_breakdown`: strict / advisory / single-model
- `rotation.stale`: true if no rotation events in the last 24h

Phase 4 soak summary (#1727) pulls these via `npm run hamr:rotation-snapshot`.

## Phase 1.1 inventory check

Verified against #1717: with HAMR's current adapter set (anthropic,
openai-compatible, ollama, openrouter, litellm, fleet), the 4-team
universe (claude-code, codex, copilot, openclaw) is fully representable.
The rules can be satisfied for multi-family operators; single-family
operators fall back via the #1722 spec.

## Out of scope

- Implementing the worker route — Phase 3.2 (#1724).
- Provider-adapter changes — downstream of provider adapters.
- Cross-ticket state sharing — each ticket's rotation state is independent.

## Related

- #1716 Epic, #1719 contract v2, #1717 inventory, #1722 fallback spec
- #1724 (Phase 3.2 implementation consumes this design)
