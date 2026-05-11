# CHANGELOG Fragments — Author Guide

Megingjord adopts a per-ticket fragment pattern for `CHANGELOG.md` updates.
Each PR writes a single file under `.changes/unreleased/<ticket-N>.md` instead
of editing the shared `CHANGELOG.md` directly. Aggregator runs at release
time and prepends all fragments into `CHANGELOG.md`.

Eliminates merge conflicts when multiple PRs ship in parallel.

## Writing a fragment

For a PR linked to ticket `#N`, create `.changes/unreleased/N.md` with the
same content you would have prepended to `CHANGELOG.md`:

```markdown
## [Unreleased] — #1132: per-ticket CHANGELOG fragments

### Added
- `scripts/global/changelog-aggregate.js` — aggregator script
- `docs/howto/changelog-fragments.md` — this guide

### Changed
- `instructions/release-docs-hygiene.instructions.md` — codified pattern
```

Conventions:

- Filename is `<ticket-number>.md` so aggregation is deterministic.
- Top-level heading is `## [Unreleased] — #N: <one-line title>`.
- Subsections follow [Keep a Changelog](https://keepachangelog.com/):
  Added · Changed · Deprecated · Removed · Fixed · Security.
- Body uses ordinary markdown; no special syntax.

## Bypassing the fragment requirement

For trivial PRs (typo fix, comment edit, etc.) where no changelog entry is
warranted, include the literal string `[skip-changelog]` in the PR description.
The `doc-update-gate` workflow honors this token.

## When fragments aggregate into CHANGELOG.md

At release time (post-version-tag) OR manually via:

```bash
node scripts/global/changelog-aggregate.js
```

With options:
- `--dry-run` — preview without writing
- `--archive-to <dir>` — move fragments to `<dir>` after aggregation
  (instead of deleting them)

## What happens to fragments after aggregate

Default: deleted (the canonical record is now in `CHANGELOG.md`).
With `--archive-to .changes/v3.4.0`: moved to that directory for audit.

## Why this pattern

`CHANGELOG.md` is 1,691 lines and grows with every shipped change. Every PR
historically prepended at the top of the same file, creating guaranteed
merge conflicts when multiple PRs were in flight. PR #1129/#1116 collided
on 2026-05-08; required manual rebase + force-push. The fragment pattern
eliminates the conflict surface — no two PRs touch the same file.

See `#1132` for context.

## Doc-update-gate integration

`.github/workflows/doc-update-gate.yml` accepts either:
- A change to `CHANGELOG.md` (legacy path; still works for backward compat)
- A change to `docs/`, `README.md`, or `.github/*.md`
- A change under `.changes/unreleased/*.md` (preferred new path)

So you can use either pattern; the gate passes both.

## Examples

See `.changes/unreleased/` for the most recent in-flight fragments (if any).
The 7 piloted fragments from Epic #1103 (May 2026) were the precedent.
