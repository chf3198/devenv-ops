# Codex AGENTS and Config Hardening

## Ticket

- Issue: #1482 under Epic #1480.
- Scope: Codex instruction and config surfaces only.
- Non-conflict: no routing, workflow, or active Claude/Copilot implementation files changed.

## OpenAI Codex Basis

- Official Codex GitHub review docs say Codex searches repositories for
  `AGENTS.md`, follows Review guidelines there, and applies the closest
  `AGENTS.md` to each changed file.
- Official Codex config docs say user config lives in `~/.codex/config.toml`;
  project-scoped overrides may live in `.codex/config.toml`, but load only after
  project trust.
- The same config reference defines `project_doc_fallback_filenames` as
  additional filenames to try only when `AGENTS.md` is missing.

## Decision

1. Add Codex review guidance to top-level `AGENTS.md`, because that is the
   documented review surface Codex uses in GitHub.
2. Keep `.codex/AGENTS.md` focused on Codex runtime governance and source versus
   deployed-runtime boundaries.
3. Keep `.codex/config.toml` minimal and single-sourced; fallback filenames stay
   compatibility-only, not canonical governance.

## Validation Plan

- Markdown lint for touched Markdown.
- TOML parse for Codex config files.
- Repo lint and git diff checks.

Signed-by: Quill Mason
Team&Model: codex:gpt-5.4@codex-cli
Role: collaborator
