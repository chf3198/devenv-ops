## [Unreleased] — synthesis-1131 bootstrap (cross-team R&D for Epic #1130)

### Added
- `planning/synthesis-1131/KICKOFF.md` — per-synthesis parameters (synthesis-dir, branch, Epic, R&D ticket, kickoff/cap timestamps).
- `planning/synthesis-1131/decisions.md`, `status.md`, `pulse.json` — initialized for synthesis kickoff.

### Changed
- `planning/prompts/team-rd.md`, `team-prep.md`, `team-init.md`, `admin-init.md` — parameterized with `<SYNTHESIS-DIR>`, `<SYNTHESIS-BRANCH>`, `<EPIC>`, `<RD-TICKET>` placeholders so the same prompts work for any synthesis run.
