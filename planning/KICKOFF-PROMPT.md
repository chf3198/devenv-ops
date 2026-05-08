# Cross-Team R&D Synthesis — Kickoff Prompt (DEPRECATED 2026-05-08)

**DEPRECATED.** This single-prompt kickoff conflated admin and participant roles and didn't give participating teams enough prep time to internalize signing/format rules — leading to a Copilot Team signature variance. Replaced by the two-phase structure in `planning/prompts/`:

- `admin-init.md` — for the Admin (Claude Code Team)
- `team-prep.md` — read-only prep for Copilot/Codex Team
- `team-init.md` — execution prompt for Copilot/Codex Team

Kept here for historical reference. Do not use for new synthesis runs.

---

**(legacy text — Identical text to be issued to Claude Code Team, Copilot Team, and Codex Team.)**

You are a participant in a parallel multi-team R&D synthesis for Epic #1103 ("Harden harness goals across instructions and docs"). Three teams (Claude Code, Copilot, Codex) have each posted independent first-pass R&D artifacts on issue #1105. You are now in the **synthesis phase** — converging those three inputs into a unanimous (or admin-tiebroken) implementation plan.

## Your team code

- Claude Code Team → `cc`
- Copilot Team → `cp`
- Codex Team → `cx`

(Substitute your code into the instructions below.)

## Read first (before any edits)

1. `planning/protocol.md` — full structural protocol. Read end-to-end.
2. `planning/README.md` — quick-start.
3. `planning/artifacts/INDEX.md` — section-level reference table. **Required for cross-references.**
4. `planning/artifacts/cc-rd.md`, `cp-rd.md`, `cx-rd.md` — all three R&D documents (read-only).
5. `planning/artifacts/cc-critique.md` — Claude Code Team's earlier scope critique on Epic #1103 (predates the R&D pass, contains a known factual error corrected in `[CC-RD §0.2]`).
6. `planning/status.md` — current synthesis state + 10 provisional decision candidates (D-001..D-010).

## What you produce

You operate **fully in parallel** with the other two teams. You do not wait for turns or rounds. The protocol uses *quiescence + stability detection* (research-backed; see `protocol.md` §9) instead of synchronous rounds.

**Files you may write** (only these):

- `planning/positions/<your-team-code>.md` — your running position log. Append-only YAML blocks per `protocol.md` §5.
- `planning/threads/T-<your-team-code>-NNN-<slug>/<your-team-code>.md` — your comments on threads you opened.
- `planning/threads/T-<other-team-code>-NNN-<slug>/<your-team-code>.md` — your replies on threads opened by other teams.

**Strict non-mutation rule**: writes are limited to those three locations. No edits anywhere else.

**Decision-lock rule**: `decisions.md` is admin-only. No participating team writes to `decisions.md`, `status.md`, or `pulse.json`. Teams influence `decisions.md` by posting verdicts in their position files.

**Thread-creation ownership**: a team may create only `planning/threads/T-<your-team-code>-NNN-*/` directories. Do not create thread directories with another team's prefix.

**Files you must NEVER touch**: any file under `planning/positions/` or `planning/threads/` belonging to another team. Any file under `planning/artifacts/`. The state files (`status.md`, `decisions.md`, `pulse.json`) — those are admin-maintained.

## Indexing scheme (mandatory for all references)

- `[CC-RD §4-G3]` — Claude Code R&D §4 G3 row
- `[CP-RD seedmap-G7]` — Copilot R&D seed-map G7 row
- `[CX-RD C3]` — Codex R&D conflict C3
- `[T-cp-001]` — Copilot's first thread
- `>> [T-cc-001 cx-2]` — replying to Codex's 2nd comment in CC's thread T-cc-001
- `cf:[CC-RD §6.2]` — citing source evidence

See `planning/artifacts/INDEX.md` for the full list of valid anchors.

## Sign-off format (per decision, not global)

Append a YAML block to `planning/positions/<your-team-code>.md` for every decision you take a position on:

```yaml
---
decision_ref: D-001                                     # or null for new decisions you propose
threads: [T-cc-001, T-cp-002]                           # threads informing this position
verdict: agree | disagree-not-blocking | disagree-blocking | abstain
rationale: <≤200 chars>
evidence:
  - cf:[CC-RD §6.2]
  - websearch: https://example.com (accessed 2026-05-08T03:00:00Z)
  - repo: scripts/global/foo.js#L42-L58
Signed-by: <your-human-alias>
Team&Model: <team>:<model>@<substrate>
Role: consultant
last_activity_utc: <ISO-8601>
quiescent: false                                        # set to true when you're done with this decision
---
```

**Evidence-format precision**:

- `repo:` MUST use line anchors: `path/file.ext#L<start>-L<end>` (or `#L<n>` for a single line). Plain paths are insufficient.
- `websearch:` MUST include `(accessed <ISO-8601-UTC>)` for link-rot protection.
- `cf:` uses the bracketed indexing scheme — no line ranges needed.

Verdict vocabulary:

- `agree` — full sign-off
- `disagree-not-blocking` — disagrees on merits but accepts consensus (counts as PASS)
- `disagree-blocking` — refuses the decision; escalates to admin tie-break
- `abstain` — out of scope or insufficient information

## Termination

You don't decide when synthesis ends — the admin (Claude Code Team, structural-only) does, by first-of:

1. **All teams quiescent + all decisions resolved** (target).
2. **Per-decision stability**: 2 consecutive admin snapshots (every 6h) with unchanged verdicts.
3. **Wall-clock cap**: 2026-05-10T23:59:59Z (72h from kickoff).
4. **Emergency halt**: any team posts `EMERGENCY_HALT` block.

Set `quiescent: true` on your position blocks when you have nothing more to add. Walk away. Don't keep posting if you've already said everything.

**Anti-spam guard**: once you have posted `quiescent: true` on a decision, do NOT post again on that decision unless **new evidence changes your verdict**. Re-emphasis without new evidence is noise and skews stability detection.

## WebSearch is welcome (but optional)

You may cite web sources to back arguments. Format: `websearch: <URL>` in the evidence list. Do NOT make WebSearch a hard requirement — repo evidence (`file:line`) and cross-refs (`cf:[<ref>]`) carry equal weight.

## Admin tie-break (Claude Code Team only)

Per `protocol.md` §6, when consensus cannot be reached, the admin posts a tie-break block. The admin's content arbitration is **constrained**: only after stability or wall-clock-cap, never preempting team consensus.

If admin tie-break is invoked on >25% of decisions, the operator (chf3198) is escalated.

## Goal of this phase

Produce a single agreed implementation plan for Epic #1103. The output is `planning/decisions.md` (admin-curated, promoted from your positions when consensus is reached) plus, if needed, `planning/escalation.md` for items that must reach the operator.

**Don't propose implementation tickets in this phase.** Decisions only. Implementation child-tickets get filed AFTER the operator approves the final `decisions.md`.

## Sign-off acknowledging this protocol

Before posting your first position, append the following acknowledgment to `planning/positions/<your-team-code>.md`:

```yaml
---
PROTOCOL_ACK: true
read:
  - planning/protocol.md
  - planning/README.md
  - planning/artifacts/INDEX.md
  - planning/artifacts/cc-rd.md
  - planning/artifacts/cp-rd.md
  - planning/artifacts/cx-rd.md
Signed-by: <your-human-alias>
Team&Model: <team>:<model>@<substrate>
Role: collaborator
last_activity_utc: <ISO-8601>
---
```

Then begin work.
