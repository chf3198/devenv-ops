# Cross-Team R&D Artifact Index — Synthesis #1131

Section-level reference table. Built by admin (Claude Code Team) at 2026-05-08T19:55Z after Phase-R completion + provenance-recovery from git history.

## Provenance correction (read this first)

A signature-variance + accidental-overwrite incident occurred during Phase-R:

```
   commit 4b86bb2  Copilot     76 lines  (Caden Vale / codex:gpt-5.3-codex@codex-cli)
   commit f8170ff  Codex      143 lines  (Nova Harper / codex:gpt-5@codex-cli)
   ─────────────────────────────────────────────────────────────────────────────
   Both commits wrote to cx-rd.md. Codex's commit OVERWROTE Copilot's.
   Copilot's 76-line work was recovered from git history and placed at cp-rd.md.
   No edits to either team's content; this is structural admin only.
```

**Root cause**: registry derives `team` from `model`. Copilot's session had Auto-routed `gpt-5.3-codex` model, which the registry assigns to team `codex`. Both teams therefore self-identified as `cx` and wrote to the same slot. The substrate (extension panel where the chat lives) is the reliable team signal — registry needs a substrate-first rule (follow-up #TBD).

## Canonical artifact codes

| Code | File | Author (substrate authority) | Internal signing claim | Status | Length |
| --- | --- | --- | --- | --- | --- |
| `CC-RD` | `cc-rd.md` | Claude Code Team (claude-code-cli substrate) | claude-code:opus-4-7@anthropic / Orla Harper | OK | 155 lines |
| `CP-RD` | `cp-rd.md` | Copilot Team (github-copilot substrate, Auto picked gpt-5.3-codex) | codex:gpt-5.3-codex@codex-cli / Caden Vale (model-derived; substrate-correct team is `cp`) | signature-variance | 76 lines |
| `CX-RD` | `cx-rd.md` | Codex Team (codex extension substrate; fallback to codex-cli per prompt allowance) | codex:gpt-5@codex-cli / Nova Harper | OK | 143 lines |

## CC-RD section anchors

| Anchor | Heading |
| --- | --- |
| `[CC-RD contam]` | Contamination declaration (heavy — same operator session authored #1130, #1131, founding 0% utilization assessment) |
| `[CC-RD sources]` | Source inventory |
| `[CC-RD Q1]`..`[CC-RD Q19]` | Per-question response (CC also covered Q18-Q19 cross-team value beyond the 17 questions in #1131 body) |
| `[CC-RD conflicts]` | Conflict / opportunity matrix C1-C6 |
| `[CC-RD proposal]` | 5-PR proposal sequence |
| `[CC-RD rollout]` | Rollout (~2.1d) |
| `[CC-RD rating]` | Self-rating G1..G9 |

## CP-RD section anchors

| Anchor | Heading |
| --- | --- |
| `[CP-RD contam]` | Contamination declaration (terse — did not read peer artifacts; #1131/#1130 + repo evidence only) |
| `[CP-RD sources]` | Source inventory (concise; covers wrapper/adapter/freshness/push/cron/tests/UI) |
| `[CP-RD Q1]`..`[CP-RD Q17]` | Per-question response (matches #1131 body's actual Q-count) |
| `[CP-RD ConflictA-C]` | Conflict matrix |
| `[CP-RD Opportunity1-2]` | Opportunity matrix |
| `[CP-RD proposal]` | "Contract-First HAMR v2.1" proposal |
| `[CP-RD rollout]` | 10-step rollout (each ≤0.5d) |
| `[CP-RD rating]` | Self-rating G1..G9 (4/5 and 5/5 scores) |
| `[CP-RD evidence]` | Evidence notes (key anchors) |

## CX-RD section anchors

| Anchor | Heading |
| --- | --- |
| `[CX-RD contam]` | Contamination declaration (read sibling Epics + repo files; flagged Q18-Q19 absence) |
| `[CX-RD sources]` | Source inventory (broadest — incl. cloudflare/hamr/routes + dashboard) |
| `[CX-RD Q1]`..`[CX-RD Q17]` | Per-question response |
| `[CX-RD C1]`..`[CX-RD C7]` | Conflict matrix HIGH-severity HAMR-coverage gaps |
| `[CX-RD O1]`..`[CX-RD O2]` | Opportunity matrix |
| `[CX-RD proposal]` | 7-item proposal: wrapper-result contract + adapter taxonomy + lint + audit |
| `[CX-RD rollout]` | 10-step rollout (~4.4d total) |
| `[CX-RD rating]` | Self-rating G1..G9 |

## Three-way cross-team finding map

| Topic | CC | CP | CX | Status |
| --- | --- | --- | --- | --- |
| Build fleet adapter shim (closes 0% utilization gap) | YES `[CC-RD Q1]` | YES `[CP-RD Q5]` (wrapper enforcement) | YES `[CX-RD Q1]` (named `fleetCall`) | **3-team agree** |
| Wrap LiteLLM, don't replace it | YES | implied (CP-RD §47-49 keep wrapper opt-in extension) | YES | **3-team agree** |
| openai-compat adapter for Cerebras/Groq | YES | NOT MENTIONED | YES (with provider_id tag) | **CC + CX agree; CP silent** |
| Cloud / Cloudflare adapter | YES | NOT MENTIONED | YES (LiteLLM-first preferred) | **CC + CX agree; CP silent** |
| Add Azure/Google AI Studio adapters | NOT MENTIONED | YES `[CP-RD Q2]` | NOT MENTIONED | **CP-only proposal** |
| Bypass-detect lint (advisory→required) | YES `[CC-RD Q5]` (`lint-hamr-bypass.js`) | YES `[CP-RD Q6]` (static patterns) | YES `[CX-RD Q5]` (`hamr-coverage-lint.js`) | **3-team agree** |
| Diagnostic carve-out: exempt vs wrap-and-tag | EXEMPT via annotation | TIER=diagnostic with required trace tag, local-only destinations | WRAP, tag `tier:'diagnostic'`, exclude from production utilization | **CP + CX agree (tier-based); CC concedes** |
| Goal Health Score sensor | `wrapped/total` | `hamr:wrapper-utilization` audit check | `wrapped/(wrapped + detected_unwrapped)` excluding diagnostics | **CX formula most robust; all three propose the audit check** |
| /quota always-fresh: push cron + Worker scheduled | YES | YES `[CP-RD Q12]` (dual-source) + 12h SLO alarm | YES + visible push-failure state | **3-team agree; CP adds 12h SLO; CX adds failure visibility** |
| Wrapper result contract `{ok, value, sticky, spillover, meta}` | NOT MENTIONED | NOT MENTIONED (but tests already assert sticky/spillover) | YES `[CX-RD proposal item 2]` | **CX-only formal proposal** |
| Provider-identity dimension (runtime + provider + tier) | NOT MENTIONED | implied (provider in adapter schema `[CP-RD Q1]`) | YES (explicit) | **CX explicit, CP implicit** |
| Migration inventory size | 5-15 estimate | "scripts/global direct callers + diagnostics + dashboard" | 13 actionable surfaces with file:line | **CX authoritative on count; all three agree on shape** |
| Effort estimate | ~2.1d (5 PRs) | ~5.0d (10 children @ 0.5d each) | ~4.4d (10 children) | **CP and CX granularity matches; CC concedes** |
| `MEGINGJORD_HAMR_DISABLED=1` policy | NOT MENTIONED | break-glass only + audit log marker `[CP-RD Q15]` | rollback per-adapter while lint advisory `[CX-RD Q15]` | **CP + CX agree** |
| `hamr-sync-verify` as release gate | NOT MENTIONED | YES `[CP-RD Q14]` | implied | **CP-only explicit** |

## Synthesis observation (admin)

- **3-team agreement on the core architecture**: fleet adapter shim, wrap LiteLLM, bypass-detect lint, dashboard panel, /quota always-fresh.
- **CP-unique findings**: Azure/Google AI Studio adapters; `MEGINGJORD_HAMR_DISABLED` audit-log marker; `hamr-sync-verify` as release gate; `/quota.last_update_ms` + `freshness_slo_ms` enrichment.
- **CX-unique findings**: wrapper-result contract standardization; provider-identity dimension; explicit Q9 sensor formula handling missing data; deeper file:line inventory.
- **CC-unique contributions**: covered Q18-Q19 (the absent questions); founding 0% utilization assessment context.
- **CP and CX granularity is more honest** than CC's; CC's effort estimate (~2.1d) likely understates, will concede in synthesis.
- **Diagnostic carve-out**: CC was wrong (exempt-via-annotation); CP and CX both prefer wrap-and-tag with diagnostic tier. CC concedes pre-synthesis.

Three independent passes produced a strong base. No team's analysis alone covers everything — confirms cross-team R&D value for #1130.

## Known signature variance (for follow-up registry fix)

```
   Both CP-RD and CX-RD internally signed Team&Model: codex:...@codex-cli
   despite CP being team Copilot per its substrate (github-copilot).
   Root: registry team-derivation key is `model`; should be `substrate`.
   Tracked for follow-up after #1131 synthesis closes.
```
