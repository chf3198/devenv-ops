# Cross-Team R&D Artifact Index

Section-level reference table for indexing scheme `[<team>-<doc>:<anchor>]`.

## Canonical artifact codes

| Code | File | Author | Length |
| --- | --- | --- | --- |
| `CC-RD` | `cc-rd.md` | Claude Code Team (Orla Harper) | 262 lines |
| `CP-RD` | `cp-rd.md` | Copilot Team | 82 lines |
| `CX-RD` | `cx-rd.md` | Codex Team (Cora Harper) | 124 lines |
| `CC-CRIT` | `cc-critique.md` | Claude Code Team (Orla Harper, prior input) | 191 lines |

## CC-RD section anchors

| Anchor | Heading |
| --- | --- |
| `[CC-RD §0.2]` | Correction to Claude Code Team's prior critique (the @-include-claim correction) |
| `[CC-RD §1]` | Goal-surface inventory |
| `[CC-RD §1.1]` | Surfaces with G-prefix |
| `[CC-RD §1.2]` | Surfaces without G-prefix |
| `[CC-RD §1.3]` | Surfaces with expanded definitions |
| `[CC-RD §2]` | Conflict / severity matrix |
| `[CC-RD §3]` | Canonical source proposal |
| `[CC-RD §3.2]` | 5 follow-on changes |
| `[CC-RD §4]` | G1..G9 enforcement map |
| `[CC-RD §4-G1]` … `[CC-RD §4-G9]` | per-goal row |
| `[CC-RD §5]` | G1..G9 evidence map |
| `[CC-RD §5-G1]` … `[CC-RD §5-G9]` | per-goal row |
| `[CC-RD §6]` | Rollout sequence |
| `[CC-RD §6.2]` | Risk register (incl. G3-vs-G1 tradeoff) |
| `[CC-RD §7]` | Diff vs prior critique |
| `[CC-RD §8]` | Cross-team synthesis hooks |

## CP-RD section anchors

| Anchor | Heading |
| --- | --- |
| `[CP-RD summary]` | TL;DR table at top |
| `[CP-RD inventory]` | Goal-surface inventory table |
| `[CP-RD conflicts]` | Conflict matrix table |
| `[CP-RD canon]` | Canonical source proposal block |
| `[CP-RD seedmap]` | G1..G9 enforcement+evidence seed map |
| `[CP-RD seedmap-G1]` … `[CP-RD seedmap-G9]` | per-goal row |
| `[CP-RD rollout]` | Sequenced post-R&D rollout |
| `[CP-RD next]` | Actionable next steps |

## CX-RD section anchors

| Anchor | Heading |
| --- | --- |
| `[CX-RD purpose]` | Purpose |
| `[CX-RD contam]` | Contamination declaration |
| `[CX-RD sources]` | Source inventory |
| `[CX-RD enforce]` | Enforcement inventory |
| `[CX-RD enforce-G1]` … `[CX-RD enforce-G9]` | per-goal row |
| `[CX-RD conflicts]` | Conflict matrix C1..C8 |
| `[CX-RD C1]` … `[CX-RD C8]` | per-conflict row |
| `[CX-RD canon]` | Canonical proposal (5 numbered items) |
| `[CX-RD rollout]` | Rollout sequence |
| `[CX-RD rating]` | Nine-goal planning rating |

## Initial cross-team finding map (admin precomputed; non-authoritative)

The admin (Claude Code Team) has identified the following points where teams independently agree, partially agree, or diverge. Teams should challenge or extend this map.

| Topic | CC | CP | CX | Status |
| --- | --- | --- | --- | --- |
| Canonical source = `harness-goals.instructions.md` | YES `[CC-RD §3.1]` | YES `[CP-RD canon]` | YES `[CX-RD canon item 1]` | **3-way agree** |
| @-include-claim is wrong | YES `[CC-RD §0.2]` | NOT MENTIONED | NOT MENTIONED | needs CP+CX verification |
| Wiki "Always-Loaded Surfaces" claim is wrong | YES `[CC-RD §2]` | NOT MENTIONED | YES `[CX-RD C4]` (analogous) | **CC + CX agree; CP silent** |
| Aggregated G1..G9 enforcement map is the main unmet value | YES `[CC-RD §4]` | YES `[CP-RD summary]` | YES `[CX-RD canon item 2]` | **3-way agree** |
| `global-task-router` says "second-highest priority goal" — drift | NOT MENTIONED | NOT MENTIONED | YES `[CX-RD C3]` (HIGH severity) | **CX-only finding** |
| `session_context.py` uses "ZeroCost" spelling | NOT MENTIONED | NOT MENTIONED | YES `[CX-RD C5]` (LOW) | **CX-only finding** |
| Runtime-deploy sync gap | NOT MENTIONED | NOT MENTIONED | YES `[CX-RD C8]` (HIGH) | **CX-only finding** |
| Effort estimate | ~1.0d `[CC-RD §6.1]` | ~1d (4 children) `[CP-RD rollout]` | not specified | mostly aligned |
| `role-baton-routing` is a high-severity drift surface | NOT MENTIONED | YES `[CP-RD conflicts]` (HIGH) | NOT MENTIONED | **CP-only finding** |
| Per-runtime always-loaded scoping | NOT MENTIONED | NOT MENTIONED | YES `[CX-RD C4]` | **CX-only finding** |
| Generated JSON contract for goal definitions | NOT MENTIONED | NOT MENTIONED | YES `[CX-RD canon item 2-3]` | **CX-only proposal** |

**Synthesis observation**: Codex Team independently surfaced **5 unique findings** (C3, C5, C8, runtime-scoped always-loaded, JSON-contract proposal) that neither CC nor CP captured. Copilot Team independently surfaced 1 unique finding (role-baton-routing as primary drift surface). Claude Code Team independently surfaced the @-include-claim correction. Cross-team value is empirically high — none of the three artifacts alone covers the full landscape.
