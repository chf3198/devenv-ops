# Tests directory conventions

## Discoverability

Every spec file under `tests/` must register tests via `@playwright/test` so they are collected by the project's test runner (`npm test` → `npx playwright test`):

```js
const { test, expect } = require('@playwright/test');
// or
import { test, expect } from '@playwright/test';
```

A spec file that uses bare `require('assert')` or its own IIFE sits in the test directory but Playwright registers zero tests from it. CI thinks the file is covered when nothing actually runs.

**Enforced by:** `scripts/global/megalint/test-discoverability.js` (Epic #1510, PR #1522). The validator flags any `tests/*.spec.{js,ts}` file that does not import `@playwright/test`.

## Opt-out (rare)

If a `.spec.js` file is intentionally a CLI script and not meant to be Playwright-discovered, include this magic comment at the top:

```js
// @megalint:test-discoverability:opt-out — <reason>
```

Use sparingly. Prefer placing CLI scripts under `scripts/tools/` instead.

## Fixtures + golden files

Fixtures live under `tests/fixtures/`. Golden-file outputs from load tests (e.g., `sse-load-test-1000x5.json` from #1374) are committed for reproducibility — regenerate them via the corresponding npm script when intentional changes are made.

## Related conventions

- File-size cap (≤ 100 lines) does **not** apply to files under `tests/` (per `scripts/lint.js` IGNORE_PATHS).
- Readability gate (`npm run lint:readability:ci`) does apply.
- See `inventory/coding-practice-coverage.json` for the full lint coverage map.
