# Auto-Escalate Trigger Matrix (#1738)

Phase 1.2 research for Epic #1736. Defines deterministic triggers that raise pre-merge-review severity to `high` regardless of agent confidence.

## Cited 2026 evidence

> "Certain patterns — touching auth logic, modifying database schemas, adding new dependencies — should automatically flag for human review regardless of how confident the agent is."
> — Augment Code "AI Agent Pre-Merge Verification"

> "Security vulnerabilities and credentials are the first mandatory gate — SAST, SCA, and secrets detection run fast and catch an entire class of failures that test suites will never find."
> — Augment Code 2026 best-practice guide

## Trigger categories

| Category | Detection mechanism | Severity raised to | False-positive risk |
|---|---|---|---|
| **Auth/Authn/Authz code** | Path glob: `**/*auth*`, `**/*authn*`, `**/*authz*`, `**/middleware/*token*`, `**/jwt*`, `**/oauth*` | `high` | Medium — config-only auth file changes can over-fire; whitelist applied (see below) |
| **Database schema migrations** | Path glob: `**/migrations/*`, `**/schema/*.sql`, `**/prisma/schema.prisma`, `**/*-migration.{js,ts,py}` | `high` | Low — migrations are intrinsically high-risk |
| **New external dependencies** | Lockfile diff: `package-lock.json`, `requirements.txt`, `go.mod`, `Cargo.lock`, `Gemfile.lock`. NEW package entries trigger; version bumps separately. | `high` for new package; `medium` for version bump | Medium — automated dep-bot version bumps shouldn't always be high |
| **Secret/credential paths** | Path glob: `**/.env*`, `**/secret*`, `**/credentials*`, `**/*.key`, `**/*.pem`, `**/keystore/*` | `high` | Low — these paths should be rare in PRs |
| **Workflow YAML (CI security surface)** | Path glob: `.github/workflows/*.yml`, `.gitlab-ci.yml`, `Jenkinsfile`, `Dockerfile`. AST query for new `run:` shell commands; new actions usage | `high` for new actions/SHA changes; `medium` for trivial workflow tweaks | High — workflow YAML edits are common in maintenance |
| **Cryptographic primitives** | AST/grep: usage of `crypto.*`, new `KeyId` references, new ed25519/RSA paths | `high` | Low |
| **Permission/scope expansions** | Diff query: GH workflow `permissions:` block changes; IAM/RBAC config changes | `high` | Low |
| **Test deletion** | Diff query: lines removed in `tests/**`, `**/*.spec.*`, `**/*.test.*` | `medium` (tests removed = potential coverage loss) | Medium — legitimate test refactors |

## Whitelist patterns (prevent over-fire)

| Whitelist | Reason |
|---|---|
| `**/*.lock` line changes that are ONLY `integrity:` checksum updates with no new package entries | Routine lockfile regen; not a new dep |
| Workflow YAML changes that are ONLY comment/whitespace lines | Trivial doc churn |
| Auth-path changes that are ONLY rename/move with no logic delta | File reorg, not auth logic change |
| Dependency version bumps under `~` or `^` patch ranges with no new packages | Dependabot-class auto-fix |

## Cross-reference with existing `area:*` labels

| Trigger | Aligns with existing label |
|---|---|
| Auth/Authn/Authz | `area:auth` (does not exist; recommend adding) |
| DB migrations | `area:db` (does not exist; recommend adding) |
| Workflow YAML | `area:infra` ✓ |
| Cryptographic | `area:security` (does not exist; recommend `area:security` or use `area:scripts` + flag) |
| Permission/scope | `area:governance` ✓ |

**Gap**: existing area labels don't cover auth/db/security explicitly. Phase 2.3 design (#1743) decides whether to add new area labels or use trigger matrix entirely from path globs.

## False-positive mitigation strategy

1. **Three-tier confidence**: triggers + agent confidence combine. Trigger=hit + agent-confidence=low → `medium`. Trigger=hit + agent-confidence=high → `high`.
2. **Waiver pathway**: even `high` severity can be waived via `pre-merge-review:waived-with-rationale` label + structured rationale comment. Per Phase 1.2 honor #1716's existing waiver patterns.
3. **Per-PR history**: same PR re-triggering same trigger across iterations counts once (don't pile up identical findings).

## Phase 2 consumer mapping

- Phase 2.3 (#1743) consumes this matrix → JSON specification with the path globs, AST queries, and whitelist patterns.
- Phase 3.3 (#1754) sub-agent prompts embed the trigger matrix so each sub-agent applies its own domain's triggers.

## AC verification

- [x] AC1: 8 trigger categories enumerated.
- [x] AC2: Deterministic detection mechanism per trigger (path globs, AST, diff query).
- [x] AC3: Cross-referenced with existing `area:*` labels; gaps identified.
- [x] AC4: False-positive risk per trigger documented + 4 whitelist patterns.
- [x] AC5: Phase 2 / Phase 3 consumer mapping explicit.

## Sources

- [Augment Code "AI Agent Pre-Merge Verification"](https://www.augmentcode.com/guides/ai-agent-pre-merge-verification)
- [Augment Code "AI Code Review CI/CD Pipeline"](https://www.augmentcode.com/guides/ai-code-review-ci-cd-pipeline)
- [arxiv 2401.16310 "Security Code Review with LLMs"](https://arxiv.org/html/2401.16310v5)
- [Latent.Space "How to Kill the Code Review"](https://www.latent.space/p/reviews-dead)
