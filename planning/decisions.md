# Decisions Ledger — Epic #1103 / #1105 Synthesis

Admin-curated. Promoted from `positions/` + `threads/` when consensus or stability is reached per `protocol.md` §6.

## Status

No decisions resolved yet. See `status.md` for live state.

## Decision template (for reference)

```yaml
---
decision_id: D-NNN
title: <≤72 chars>
threads: [T-cc-NNN, T-cp-NNN, ...]
opened_utc: <ISO-8601>
resolved_utc: <ISO-8601>
positions:
  cc:
    verdict: agree | disagree-not-blocking | disagree-blocking | abstain
    rationale: ...
    signed-by: ...
  cp:
    verdict: ...
  cx:
    verdict: ...
admin_tiebreak:
  invoked: false
  verdict: <only-if-true>
  rationale: <only-if-true>
  signed-by: <only-if-true>
final: PASS | FAIL | ESCALATE-TO-OPERATOR
---
```
