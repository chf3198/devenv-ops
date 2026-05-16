# ADR-019: Unified Wiki Health Contract

**Status:** Accepted
**Date:** 2026-05-16
**Refs:** #1673, #1625, #1626

## Context

The wiki surface has three health tools:

| Tool | Source | What it measures |
|---|---|---|
| `scripts/wiki/lint.js` | Repo wiki (all 4 category dirs) | broken links, orphans, frontmatter, indexSync |
| `scripts/wiki/hygiene.js` | Repo wiki | stale, duplicate, orphan, weak-link, frontmatter |
| `dashboard-api.js /api/wiki-health` | `~/.copilot/wiki/entities/` only | entity file count only |

This caused operators to see contradictory signals: "31 orphans" from the dashboard vs "17 orphans" from lint; "4 frontmatter issues" from the dashboard vs "18" from lint.

## Root Cause Analysis

**Orphan count divergence (31 vs 17):**

- The dashboard does not compute orphans. Its "31" is the **entity file count** from the deployed runtime (`~/.copilot/wiki/entities/`), not an orphan count.
- `health-contract.js` computes true orphans via link-graph traversal across all four category dirs (`entities`, `concepts`, `sources`, `syntheses`) in the repo wiki.
- These are incommensurable metrics from different directories.

**Frontmatter count divergence (4 vs 18):**

- The dashboard returns `entities` (file count), which has no relationship to frontmatter violations.
- `health-contract.js` emits one `"slug: missing 'field'"` string per missing field per page. With 4 REQUIRED_FIELDS, a single page can contribute up to 4 violations. 18 violations across N pages is a per-field count, not a per-page count.

## Decision

`scripts/wiki/health-contract.js` is the **single source of truth** for wiki health metrics.

Its `computeWikiHealth(pages?)` function and return schema are canonical:

```js
{
  loaded: boolean,
  pages: number,
  dirs: number,
  issues: number,          // total violation count
  broken: string[],        // "slug→target" per broken wikilink
  orphans: string[],       // slugs with no inbound links
  frontmatter: string[],   // "slug: missing 'field'" per violation
  indexSync: string[],     // slugs missing from index.md
  lastCheck: ISO8601,
}
```

All callers must import and call `computeWikiHealth()`. Custom ad-hoc counting is prohibited.

**`dashboard-api.js` fix:** The `/api/wiki-health` endpoint must call `computeWikiHealth()` (passing the deployed wiki path) instead of counting entity files directly. This is tracked in #1674.

## Consequences

- Lint, hygiene, and dashboard will report identical orphan and frontmatter counts.
- Dashboard endpoint gains richer health signal (broken links, orphans, frontmatter, indexSync).
- `hygiene.js` already routes through `computeWikiHealth()` for orphan data; no change needed there.
- `dashboard-api.js` requires a one-line import change and a path parameter.
