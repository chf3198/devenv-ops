# Epic #1510 — Phase-0 R&D: lint coverage + model-facing coding-practice instruction hardening

**Authority:** Claude Code Team Collaborator (Orla Harper)
**Date:** 2026-05-13
**Phase Gate compliance:** Required deliverable for Epic #1510 AC1 per Phase Gate Rule #1397.
**Scope:** Research-only. Phase-1 children to be filed after this doc lands.

## 1. Three-problem framing

Epic #1510 identifies three related gaps:

```
+-----+----------------------------+--------------------------------------+
| #   | Gap                        | Symptom                              |
+-----+----------------------------+--------------------------------------+
| 1   | Lint coverage              | ~5 enforced rules vs ~30 documented  |
|     |                            | coding practices (~17% coverage)     |
+-----+----------------------------+--------------------------------------+
| 2   | AC anti-pattern            | Tickets like #1500 / #1508 embed     |
|     |                            | "all files ≤ 100 lines" as ACs       |
+-----+----------------------------+--------------------------------------+
| 3   | Instruction-channel        | 24 instruction files (~1400 lines)   |
|     | duplication                | with topical overlap; no audit of    |
|     |                            | token cost vs. signal                |
+-----+----------------------------+--------------------------------------+
```

## 2. Lint-coverage audit

### 2a. Currently enforced rules

```
+--------------------------+----------+-----------------------------------+
| Layer                    | Source   | Rule                              |
+--------------------------+----------+-----------------------------------+
| File size                | lint.js  | ≤ 100 lines (most file types)     |
+--------------------------+----------+-----------------------------------+
| Readability              | readab.  | Single-letter vars                |
|                          |          | Magic numbers (3+ digits)         |
|                          |          | Function length ≤ 30 lines        |
+--------------------------+----------+-----------------------------------+
| Format                   | prettier | ~9 named files only (allowlist)   |
+--------------------------+----------+-----------------------------------+
| ESLint                   | flat cfg | no-unused-vars (warn)             |
|                          |          | no-undef (warn)                   |
|                          |          | eqeqeq (warn)                     |
|                          |          | no-var (error)                    |
|                          |          | prefer-const (warn)               |
|                          |          | jsdoc/require-jsdoc (warn)        |
|                          |          | jsdoc/check-param-names (error)   |
|                          |          | + 6 other JSDoc Tier-1            |
+--------------------------+----------+-----------------------------------+
| Markdown                 | mdlint   | Default ruleset                   |
+--------------------------+----------+-----------------------------------+
| Python                   | ruff     | Default ruleset                   |
+--------------------------+----------+-----------------------------------+
| Shell                    | shellch  | Default ruleset                   |
+--------------------------+----------+-----------------------------------+
| Megalint (governance)    | 9 rules  | manager-handoff, collab-handoff,  |
|                          |          | admin-handoff, consultant-closeout|
|                          |          | signer-fidelity, body-ac-truthful |
|                          |          | epic-ac-traceability,             |
|                          |          | merge-evidence, merge-evidence-   |
|                          |          | pr-gate                           |
+--------------------------+----------+-----------------------------------+
```

### 2b. Documented practices NOT enforced by lint

From `instructions/global-standards.instructions.md` § Engineering standards + `instructions/role-baton-routing.instructions.md` + CLAUDE.md:

```
+----+---------------------------------------+----------+
| #  | Practice                              | Severity |
+----+---------------------------------------+----------+
| 1  | No "Closes #N" via PR title only      | Med      |
|    | (must be in body for auto-close)      |          |
| 2  | Cyclomatic complexity                 | Med      |
| 3  | Duplication detection                 | Low-Med  |
| 4  | Dependency-import boundaries          | Med      |
|    | (megalint/* must be pure, etc.)       |          |
| 5  | --no-verify forbidden in commits      | High     |
| 6  | No live tokens/keys in docs/examples  | High     |
| 7  | Use Edit not `echo > file`            | Low      |
| 8  | No emojis unless requested            | Low      |
| 9  | Branch naming: <type>/<#>-<slug>      | Med      |
|    | (CI checks PR but not local push)     |          |
| 10 | Commit conventional types             | Med      |
| 11 | Test files use @playwright/test       | Med      |
|    | (#1489 already filed)                 |          |
| 12 | No bypass: --no-edit on rebase        | Med      |
| 13 | Issue #N referenced in commit         | Med      |
|    | (gov-004 in consultant-checks)        |          |
| 14 | Crypto-* additive signing format      | Low      |
| 15 | Phase-0 R&D before children           | High     |
|    | (#1397 enforced by baton, not lint)   |          |
| 16 | Worktree node_modules symlink         | Med      |
|    | (#1378 fix exists; no lint check)     |          |
| 17 | Goal-lens justification on overrides  | Med      |
| 18 | No discarding without ownership       | High     |
|    | confirmation (#1490 pattern)          |          |
| 19 | Crypto-Key-Id matches role            | Med      |
| 20 | Test placed under tests/ not adjacent | Low-Med  |
| 21 | Changelog fragment for behavioral PR  | Med      |
|    | (drift; some PRs skip with no flag)   |          |
| 22 | Pure functions for megalint rules     | Med      |
| 23 | Workflows pinned to commit SHA        | High     |
|    | (no @v3, must be @abc123def...)       |          |
| 24 | Tool calls in parallel when           | Low      |
|    | independent (process-only)            |          |
| 25 | Read before Edit                      | Low      |
+----+---------------------------------------+----------+
```

**Coverage estimate:**

```
Documented practice rules    : ~30
Lint-enforced practice rules : ~5 (lint.js + readability core) + 9 megalint
                                + ~10 eslint + format
Estimated coverage           : 15-25 of 30  ≈  50-83%
```

The wide range reflects how I count "enforced": narrow definition (the practice itself is linted) vs. broad (something *related* is linted). Phase-1 should calibrate by mapping each instruction line to a specific rule or `unmapped`.

## 3. AC anti-pattern survey

### 3a. Confirmed instances

```
#1500 AC6: "All new files ≤ 100 lines."
#1508 AC8: "All new files ≤ 100 lines."
```

Both ACs are tautological — the lint gate enforces it pre-push and PR-CI. Including it as an AC:
- Lets an author tick the AC by reading the rule rather than running the gate
- Implies that the AC is the source of truth (it's not — `scripts/lint.js` is)
- Doesn't generalize: only the rules an author happens to think of get listed
- Creates audit noise on the body-ac-truthfulness validator

### 3b. Recurrence rate

```
Sample: 6 recently-closed Phase-1 children of Epic #1486
+----------+---------------------+
| Ticket   | Has lint-as-AC?     |
+----------+---------------------+
| #1491    | no (lane:research)  |
| #1498    | no                  |
| #1500    | YES (AC6)           |
| #1506    | no                  |
| #1508    | YES (AC8)           |
| #1512    | no (lane:research)  |
+----------+---------------------+
Recurrence: 2 of 4 non-research children = 50%
```

50% in a recently-shipped sample is high enough to warrant a megalint rule.

### 3c. Anti-pattern definition (for the rule)

A lint-as-AC matches when an issue's `## Acceptance Criteria` section contains a bullet matching any of:

- `\b(all\s+)?(new\s+)?files?\s+(must\s+be\s+)?(≤|<=|under|below|within)\s+(\d+)\s*line` (file-size restate)
- `\b(prettier|markdownlint|ruff|shellcheck|eslint)\b` (named tool restate)
- `\blint\s+(clean|green|pass)\b` (generic lint-clean restate)
- `\bformat:check\s*(green|pass)?\b` (npm-script restate)
- `\b(readability|whitespace|trailing\s+whitespace)\b\s+(check|pass)\b`

Override: if the AC is *adding* a new rule (e.g., "new lint rule X catches Y"), it's NOT the anti-pattern — that's actual work. The validator must distinguish "the AC IS a lint requirement" from "the AC ADDS a lint rule." Phrasing heuristic: ACs starting with `New rule` / `Add lint` / `Megalint validator` are the work; ACs starting with `All files ≤` / `npm run lint passes` are the anti-pattern.

## 4. Instruction-channel inventory

### 4a. Files + sizes

```
Total: 1441 lines across 24 instruction files + CLAUDE.md + AGENTS.md
+-----+------------------------------------------+--------+
| #   | File                                     |  Lines |
+-----+------------------------------------------+--------+
| 1   | role-baton-routing                       |  100   |
| 2   | ticket-driven-work                       |  100   |
| 3   | observability                            |   96   |
| 4   | epic-governance                          |   88   |
| 5   | hamr-routing                             |   84   |
| 6   | AGENTS.md                                |   78   |
| 7   | workflow-resilience                      |   78   |
| 8   | cross-team-consultant                    |   66   |
| 9   | github-governance                        |   66   |
| 10  | repo-health-onboarding                   |   65   |
| 11  | global-task-router                       |   62   |
| 12  | test-methodology-matrix                  |   58   |
| 13  | team-model-signing                       |   52   |
| 14  | readability-commenting-governance        |   50   |
| 15  | visual-qa-governance                     |   49   |
| 16  | sandbox-worktree-governance              |   44   |
| 17  | wiki-knowledge                           |   43   |
| 18  | ide-proxy                                |   42   |
| 19  | CLAUDE.md                                |   42   |
| 20  | global-standards                         |   36   |
| 21  | feature-completion-governance            |   35   |
| 22  | operator-identity-context                |   33   |
| 23  | harness-goals                            |   30   |
| 24  | playwright-mcp-low-resource              |   24   |
| 25  | release-docs-hygiene                     |   20   |
+-----+------------------------------------------+--------+
```

### 4b. Loading mechanism

CLAUDE.md (42 lines) loads `instructions/*.md` via `@instructions/<file>` references. **All 23 referenced files are pulled into every session's context**. Total instruction load: ~1400 lines.

At ~12 tokens/line (rough markdown average), that's **~17,000 tokens** of instruction context per session — before any user work, tool calls, or memory.

### 4c. Topic overlap (sample)

Searching for shared topics:

```
Topic                      Files mentioning it
─────────────────────────────────────────────────────────────────────
Signed-by / Team&Model     3 (team-model-signing, cross-team, AGENTS)
baton / MANAGER_HANDOFF    7 (observability, operator-identity, epic,
                              workflow-resilience, github, role-baton,
                              feature-completion, team-model, CLAUDE)
100-line file cap          2 (CLAUDE.md, AGENTS.md)
goal-lens / G1-G9          ~9 (global-standards, observability, hamr,
                                + 6 others via reference)
```

Duplication is real but bounded — each file references the others rather than re-stating in full. The cost is still tokens-per-session and risk of drift when one copy updates without the others.

### 4d. Optimal channel matrix

For each class of coding practice, the optimal model-instruction channel:

```
+---------------------------------+---------------------------------------+
| Practice class                  | Optimal channel                       |
+---------------------------------+---------------------------------------+
| Mechanical/automated (lint,     | LINT rule — never reaches model;      |
|  format, line count, naming)    | gate catches it; instruction file     |
|                                 | only documents existence              |
+---------------------------------+---------------------------------------+
| Process/governance              | INSTRUCTIONS file loaded via CLAUDE.md|
|  (baton flow, AC truthfulness,  | — must reach model every session;     |
|  signer derivation)             | regex-mechanical alternative exists   |
|                                 | via megalint                          |
+---------------------------------+---------------------------------------+
| Architectural/design            | CLAUDE.md or AGENTS.md — load every   |
|  (pure functions, deps          | session; high-priority signal         |
|  boundaries)                    |                                       |
+---------------------------------+---------------------------------------+
| Per-task surface                | SKILL file under .claude/commands/    |
|  (Playwright MCP, wiki ops,     | — load on skill invocation only;      |
|  cron management)               | zero token cost when unused           |
+---------------------------------+---------------------------------------+
| Reference / lookup              | wiki/ entry — load on explicit query  |
|  (operator runbooks)            | only; eats no per-session tokens      |
+---------------------------------+---------------------------------------+
```

**Heuristic**: if a practice can be enforced mechanically, MOVE IT TO LINT and remove from instruction context. The lint catches the violation; the instruction file doesn't need to remind the model. This frees per-session tokens for practices that genuinely require model judgment.

## 5. Recommendation matrix

```
+-----+-----------------------------+--------------------------+----------+
| #   | Gap                         | Recommended action       | Priority |
+-----+-----------------------------+--------------------------+----------+
| G1  | Lint-as-AC anti-pattern     | New megalint validator   | High     |
| G2  | --no-verify in commits      | git hook + repo policy   | High     |
| G3  | Live tokens/keys in source  | secret-scan workflow     | High     |
|     |                             | (Gitleaks/TruffleHog)    |          |
| G4  | Workflow @v3 not pinned     | Lint workflow YAML refs  | High     |
| G5  | Cyclomatic complexity       | eslint complexity rule   | Med      |
| G6  | Dependency import boundary  | depcruise / custom lint  | Med      |
| G7  | Bare-assert tests (#1489)   | Resolves existing ticket | Med      |
| G8  | Commit conventional types   | commitlint pre-push      | Med      |
| G9  | Branch naming local         | git pre-push hook        | Med      |
| G10 | No emojis unless requested  | Already in CLAUDE.md;    | Low      |
|     |                             | model-judgment, leave    |          |
| G11 | Read-before-Edit            | Already enforced by tool | n/a      |
|     |                             | (Edit refuses w/o Read)  |          |
| G12 | Instruction duplication     | Audit + consolidate      | Med      |
|     |                             | (Phase-1c)               |          |
+-----+-----------------------------+--------------------------+----------+
```

## 6. Implementation paths

### Path A — Aggressive: all rules now

Implement 8 new lint rules + secret-scan + AC anti-pattern validator + instruction consolidation in one Epic-completion push. Pro: short total wall-clock. Con: high risk of false positives at the moment of activation; no soak period.

### Path B — Phased advisory→required (mirrors Epic #1486)

Each new rule lands first as advisory (megalint comment, no PR fail), gets 2-week soak, then promotes to required with override-label path. Pro: empirically calibrated. Con: longer total timeline (~6 weeks).

### Path C — Risk-tiered staging

High-severity rules (G2, G3, G4 — `--no-verify`, secret leak, unpinned actions) ship as required immediately because the harm of NOT enforcing exceeds the false-positive cost. Med/low rules use Path B soak. Pro: balances safety vs. calibration. Con: requires clear severity criteria.

## 7. Decision

**Path C (Risk-tiered)** for Phase-1 children. Rationale by goal lens:

- **G1 Governance**: required-from-day-one for harms (G2-G4). Non-negotiable.
- **G2 Quality**: soak phase for med/low rules respects false-positive risk.
- **G3 Zero Cost**: most rules are pure-function megalint additions; near-zero compute.
- **G6 Resilience**: override label path preserves operator agency for legitimate edge cases.
- **G7 Throughput**: high-severity-fast / med-severity-soaked balances delivery cadence.

## 8. Proposed Phase-1 children

```
+-------+----------+--------------------------------+-----------+----------+
| Child | Severity | Scope                          | Lane      | Strategy |
+-------+----------+--------------------------------+-----------+----------+
| 1a    | High     | AC anti-pattern megalint rule  | code-ch.  | tdd-pyr  |
| 1b    | High     | Workflow @SHA pin lint         | code-ch.  | tdd-pyr  |
| 1c    | High     | Secret-scan in CI              | code-ch.  | contract |
| 1d    | High     | Forbid --no-verify (git hook)  | code-ch.  | tdd-pyr  |
| 1e    | Med      | Cyclomatic complexity (eslint) | config    | manual   |
| 1f    | Med      | Dependency boundary lint       | code-ch.  | tdd-pyr  |
| 1g    | Med      | Test-discoverability (#1489)   | code-ch.  | tdd-pyr  |
| 1h    | Med      | commitlint conventional types  | config    | manual   |
| 1i    | Low-Med  | Instruction-channel audit +    | docs-res. | peer-rev |
|       |          | consolidation                  |           |          |
| 1j    | Final    | Coverage metric verification   | docs-res. | peer-rev |
|       |          | (target ≥ 70% practice cov.)   |           |          |
+-------+----------+--------------------------------+-----------+----------+
```

## 9. False-positive surface respected

- **Lint-as-AC validator** must distinguish *adding* a lint rule (legitimate AC) from *restating* an enforced rule (anti-pattern). Phrasing heuristic in §3c.
- **AC anti-pattern** doesn't apply to ACs in research-lane tickets (research can validly say "doc passes markdownlint").
- **Workflow @SHA** has an opt-out for repository-owned reusable workflows (allow `./.github/workflows/foo.yml`).
- **Secret-scan** must allow placeholders documented in instructions (e.g., `XXX_API_KEY=<your-key>` patterns).

## 10. Out of scope

- LLM eval harness for instruction comprehension (separate epic).
- Auto-fix for new lint rules (advisory-first; manual fix during soak).
- Removing existing lint rules (additive change only).
- Cross-language complexity (focus is JS/TS first; Python/shell rules already cover via ruff/shellcheck defaults).

## 11. References

- Epic #1510 issue body
- Phase Gate Rule #1397
- Existing megalint rules: `scripts/global/megalint/*.js` (9 rules as of #1506)
- AC anti-pattern instances: #1500, #1508
- Related: #1489 (test-discoverability), #1487 (signer alias enforcement)
- Pattern precedent: Epic #1486 Path D (advisory→required)

---

Signed-by: Orla Harper
Team&Model: claude-code:opus-4-7@anthropic
Role: collaborator
