# Issue #1673 Unified Wiki Health Contract
Date: 2026-05-16
Last-updated: 2026-05-16

## Summary Table

| Topic | Decision | Evidence |
|---|---|---|
| Canonical source | `scripts/wiki/health-contract.js` computes structural health once | Shared adoption in lint, hygiene, and dashboard health APIs |
| Required fields | `title`, `type`, `created`, `status` | Existing lint contract and schema minimum used by enforcement |
| Orphan model | Inbound links include page links + `wiki/index.md` links | Matches operational navigation reality |
| Frontmatter model | Missing required fields are counted, not just missing `---` block | Eliminates false “healthy” signals on malformed metadata |

## Findings

1. Prior implementations produced divergent orphan/frontmatter counts because
   each script implemented local logic.
2. A single contract module removes drift and allows deterministic dashboards,
   lint output, and hygiene summaries.
3. Keeping health logic local (no network calls) preserves zero-cost and
   portability goals.

## Actionable Next Steps

1. Keep new health dimensions behind this contract module first.
2. Add a parity regression test whenever health behavior changes.
3. Recompute baseline metrics in CI after major wiki ingest waves.

Signed-by: Quill Mason
Team&Model: codex:gpt-5.4@openai
Role: collaborator
