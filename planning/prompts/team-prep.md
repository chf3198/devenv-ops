# Team Prep — Cross-Team R&D Synthesis

**Audience**: Copilot Team or Codex Team session, preparing to participate in Epic #1103 / R&D #1105 synthesis.

**This phase is read-only. Do NOT post any positions yet.** You will receive a separate Init prompt when it's time to write.

## Step 1 — Sync

```bash
git fetch origin
git checkout feat/1105-synthesis-scaffold
git pull --ff-only
```

## Step 2 — Determine your team code and alias (READ THIS CAREFULLY)

Your team code is one of:

- `cp` = Copilot Team (substrate `github-copilot`)
- `cx` = Codex Team (substrate `codex-cli`)

Your **registry-derived alias** is computed from `inventory/team-model-signatures.json`:

1. Open `inventory/team-model-signatures.json`.
2. Find the registry entry whose `team` matches your team and whose `modelPattern` matches your active model.
3. The `aliasSeed` field is your **given name**.
4. Your **surname** rotates by role (also in the JSON):
   - `manager` → Mason
   - `collaborator` → Harper
   - `admin` → Reyes
   - `consultant` → Vale
5. Combine: `<aliasSeed> <role-surname>` is your `Signed-by` value.

**Critical**: Do NOT sign as `chf3198` (the operator's GitHub handle). Sign with your **team's** derived alias. The operator is the client; you are the AI agent.

**Critical model check** (Copilot Team only): the registry note says `gpt-5.*codex` models belong to team `codex`, NOT `copilot`. If your active model in Copilot Chat is `gpt-5.3-codex` or similar, switch to a Copilot-native model first (e.g., Claude Sonnet → alias seed "Soren"; Claude Opus → "Orion"; gpt-5-mini → "Milo"). Confirm your active model before continuing.

## Step 3 — Read scaffolding

In this order:

1. `planning/protocol.md` — full structural protocol (read end-to-end)
2. `planning/README.md` — quick-start
3. `planning/artifacts/INDEX.md` — section-level reference table for cross-refs
4. `planning/artifacts/cc-rd.md` — Claude Code Team R&D
5. `planning/artifacts/cp-rd.md` — Copilot Team R&D
6. `planning/artifacts/cx-rd.md` — Codex Team R&D
7. `planning/artifacts/cc-critique.md` — Claude Code earlier critique (contains a known factual error corrected in [CC-RD §0.2])
8. `planning/positions/cc.md` — existing Claude Code positions (reference only — do NOT touch)
9. `planning/positions/cx.md` — existing Codex positions (reference only — do NOT touch)
10. `planning/positions/cp.md` — your team's file (will be written in Init phase)
11. `planning/status.md` — current synthesis state + 11 provisional decisions D-001..D-011

## Step 4 — Internalize the rules

Before posting anything in the Init phase:

- **Files you may write**: `planning/positions/<your-team-code>.md` only (append-only). And `planning/threads/T-<your-team-code>-NNN-*/<your-team-code>.md` if you open threads (none currently exist).
- **Files you must NEVER touch**: any other team's position or thread file; anything in `planning/artifacts/`; the admin-maintained `status.md`, `decisions.md`, `pulse.json`.
- **Sign-off format**: per `protocol.md` §5. YAML block per decision. Evidence MUST use `repo: path/file.ext#L<start>-L<end>` line anchors and `websearch: <URL> (accessed <UTC>)` timestamps.
- **Anti-spam**: once you post `quiescent: true` on a decision, do not post again on that decision unless **new evidence changes your verdict**.

## Step 5 — Confirm readiness

Reply to the operator with a single line:

```
READY: <team-code> as <Signed-by alias>, <Team&Model> string
```

Example: `READY: cp as Soren Vale, copilot:claude-sonnet-4-6@github-copilot`

The operator will then send the Init prompt.
