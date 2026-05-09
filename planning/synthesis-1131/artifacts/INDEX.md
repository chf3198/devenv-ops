# Cross-Team R&D Artifact Index — Synthesis #1131

Section-level reference table for indexing scheme `[<team>-RD:<anchor>]`. Built by admin (Claude Code Team) at 2026-05-08T19:50Z. Will be re-built when CP-RD lands.

## Canonical artifact codes

| Code | File | Author | Status | Length |
| --- | --- | --- | --- | --- |
| `CC-RD` | `cc-rd.md` | Claude Code Team (Orla Harper) | present | 155 lines |
| `CX-RD` | `cx-rd.md` | Codex Team (Nova Harper) | present | 143 lines |
| `CP-RD` | `cp-rd.md` | Copilot Team | **PENDING Phase-R** | — |

## CC-RD section anchors

| Anchor | Heading |
| --- | --- |
| `[CC-RD contam]` | Contamination declaration (heavy — CC authored #1130, #1131, founding 0% utilization assessment in same session) |
| `[CC-RD sources]` | Source inventory (file:line evidence base) |
| `[CC-RD Q1]`..`[CC-RD Q19]` | Per-question response (note: CC answered Q1-Q19; CX answered Q1-Q17 only — CC noted Q18-Q19 about cross-team value) |
| `[CC-RD conflicts]` | Conflict / opportunity matrix (C1-C6) |
| `[CC-RD proposal]` | 5-PR proposal sequence |
| `[CC-RD rollout]` | Rollout sketch (~2.1d total) |
| `[CC-RD rating]` | Self-rating G1..G9 |

## CX-RD section anchors

| Anchor | Heading |
| --- | --- |
| `[CX-RD contam]` | Contamination declaration (read sibling Epics #1112-#1126 + repo files; did not open CC-RD; flagged Q18-Q19 absence in #1131) |
| `[CX-RD sources]` | Source inventory (broader than CC-RD; includes `cloudflare/hamr/routes/*.ts` + dashboard files) |
| `[CX-RD Q1]`..`[CX-RD Q17]` | Per-question response |
| `[CX-RD C1]`..`[CX-RD C7]` | Conflict matrix (HIGH-severity HAMR-coverage gaps) |
| `[CX-RD O1]`..`[CX-RD O2]` | Opportunity matrix (extend existing patterns vs rewrite) |
| `[CX-RD proposal]` | 7-item proposal: wrapper-result contract + adapter taxonomy + lint + audit |
| `[CX-RD rollout]` | 10-step rollout (~4.4d total) |
| `[CX-RD rating]` | Self-rating G1..G9 |

## CP-RD section anchors

(awaited — will be populated when Copilot Team completes Phase-R)

## Initial cross-team finding map (admin precomputed; non-authoritative)

This map will be revised when CP-RD lands. Current observations between CC and CX only:

| Topic | CC | CX | Status |
| --- | --- | --- | --- |
| Build fleet adapter shim (closes 0% utilization gap) | YES `[CC-RD Q1]` | YES `[CX-RD Q1]` (named `fleetCall`) | **2-team agree** |
| Wrap LiteLLM, don't replace it | YES `[CC-RD Q4]` | YES `[CX-RD Q4]` | **2-team agree** |
| Single openai-compat adapter for Cerebras/Groq (with provider_id tag) | YES `[CC-RD Q3]` | YES `[CX-RD Q3]` | **2-team agree** |
| Cloud / Cloudflare adapter | YES `[CC-RD Q2]` | YES `[CX-RD Q2]` | **2-team agree** |
| Bypass-detect lint (advisory→required progression) | YES `[CC-RD Q5]` (`lint-hamr-bypass.js`) | YES `[CX-RD Q5]` (`hamr-coverage-lint.js`; same lint different name) | **2-team agree (alias) — reconcile name in synthesis** |
| Diagnostic carve-out — exempt vs wrap-and-tag | EXEMPT via `// hamr-bypass-ok` annotation `[CC-RD Q6]` | WRAP, tag `tier:'diagnostic'`, exclude from production utilization `[CX-RD Q6]` | **DISAGREE — CX position is stronger; CC concedes in advance** |
| Goal Health Score sensor formula | `wrapped / total` `[CC-RD Q9]` | `wrapped / (wrapped + detected_unwrapped)` excludes diagnostics from denominator `[CX-RD Q9]` | **CX formula is more robust to missing data** |
| /quota always-fresh: push cron + Worker scheduled handler | YES `[CC-RD Q10]` | YES `[CX-RD Q10]` plus visible push-failure state | **2-team agree; CX adds failure visibility** |
| Wrapper result contract standardization | NOT MENTIONED | YES — `{ok, value, sticky, spillover, meta}` `[CX-RD proposal item 2]` | **CX-only finding** |
| Provider-identity dimension (runtime + provider + tier) | NOT MENTIONED | YES `[CX-RD proposal item 4]` | **CX-only finding** |
| Migration inventory size | 5-15 estimate `[CC-RD Q13]` | 13 actionable surfaces with file:line `[CX-RD Q13]` | **CX-RD authoritative; CC concedes** |
| Effort estimate | ~2.1d `[CC-RD rollout]` | ~4.4d `[CX-RD rollout]` | **DISAGREE — granularity tradeoff; reconcile in synthesis** |

## Synthesis observation (admin)

CX surfaced 5+ findings CC missed (wrapper-result contract, provider-identity dimension, deeper inventory, robust sensor formula, push-failure visibility). CC found 0 unique findings vs CX. CC will likely vote `disagree-not-blocking` or `agree-with-amendment` on most CX-only findings; the more thorough analysis is the better baseline.

CC's effort estimate (~2.1d) is too granular vs CX's ~4.4d (10 children, finer-grained PRs). The CX granularity is more honest given what we now see in the inventory; CC concedes pre-synthesis.

When CP-RD lands, this map will be re-built and any CP-only or CP-disagrees findings added.
