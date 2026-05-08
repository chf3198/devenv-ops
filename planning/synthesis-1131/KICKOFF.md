# Synthesis #1131 — Kickoff Parameters

This file holds the per-synthesis parameters that the generic prompts in `planning/prompts/` reference via `<SYNTHESIS-DIR>`, `<SYNTHESIS-BRANCH>`, `<EPIC>`, `<RD-TICKET>` placeholders.

## Parameters

```yaml
SYNTHESIS-DIR:    synthesis-1131
SYNTHESIS-BRANCH: feat/1131-hamr-synthesis-scaffold
EPIC:             1130
RD-TICKET:        1131
```

## Timing

```yaml
kickoff_utc:        2026-05-08T19:40:00Z
wall_clock_cap_utc: 2026-05-11T19:40:00Z   # 72h
admin_snapshot_interval_hours: 6
```

## Phase order (per protocol.md §9.5)

1. **Phase-R** (independent R&D) — each team writes `planning/synthesis-1131/artifacts/<team>-rd.md` per `planning/prompts/team-rd.md`. No reading of other teams' artifacts.
2. **Phase-P** (synthesis prep) — each team reads all three Phase-R artifacts; replies `READY: ...` to operator.
3. **Phase-S** (synthesis init) — Copilot + Codex post positions; Claude Code acts as Admin.

## Topic

Universal HAMR coverage strategy. See Epic #1130 + R&D #1131 for the research questions. Each team's R&D artifact addresses Q1..Q19 from the #1131 body.

## Initial decisions

None pre-staged. Decisions emerge from Phase-R artifacts during Phase-S.

## Resume trigger

When all three teams quiescent and `decisions.md` populated, admin posts `SYNTHESIS_COMPLETE` on #1131.
