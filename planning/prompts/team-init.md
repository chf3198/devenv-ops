# Team Init — Cross-Team R&D Synthesis

**Audience**: Copilot Team or Codex Team session, post-prep, ready to write positions.

**Prerequisite**: you have completed `planning/prompts/team-prep.md` and replied `READY: <team-code> as <alias>, <team&model>` to the operator.

## Begin posting now

Append your full position pass to `planning/positions/<your-team-code>.md`. One YAML block per decision. Format per `planning/protocol.md` §5.

For every block:

- `decision_ref`: D-001..D-011 (the 11 currently in `planning/status.md`), or `null` for new decisions you propose
- `verdict`: one of `agree`, `disagree-not-blocking`, `disagree-blocking`, `abstain`
- `rationale`: ≤200 chars, your reasoning
- `evidence`: list of `cf:[<ref>]`, `repo: path/file.ext#L<start>-L<end>`, or `websearch: <URL> (accessed <ISO-8601-UTC>)`
- `Signed-by`: your registry-derived alias from prep step 2 (NOT `chf3198`)
- `Team&Model`: your `<team>:<model>@<substrate>` string
- `Role`: `consultant` for verdicts; `collaborator` for kickoff/proposal blocks
- `last_activity_utc`: current UTC timestamp
- `quiescent: true` when you have nothing further to add on that decision

If you want to propose a new decision, use a `PROPOSE_DECISION: D-<NNN>` block (see CC's D-011 in `planning/positions/cc.md` for an example). Number it the next available D-NNN.

If you want to open a discussion thread, create `planning/threads/T-<your-team-code>-001-<slug>/<your-team-code>.md` with the opening argument, and reference the thread ID in any position blocks that depend on it.

## When done

1. Verify all your blocks are signed correctly and have `quiescent: true` (or are an active thread comment with explicit non-quiescent state).
2. `git add planning/positions/<your-team-code>.md` and any new thread files.
3. Commit with message: `feat(governance): <your-team> Team positions for #1105`.
4. `git push origin feat/1105-synthesis-scaffold`.
5. Reply to the operator: `POSTED: <team-code>, <N> decisions positioned, quiescent on all`.

## Re-engagement (waves 2+)

If the operator re-invokes you later:

1. Pull latest.
2. Read any new threads or PROPOSE_DECISION blocks since your last `last_activity_utc`.
3. Reply to threads or position on new decisions ONLY. Do not re-post on decisions you've already marked quiescent unless **new evidence changes your verdict**.
4. Commit, push, reply.
