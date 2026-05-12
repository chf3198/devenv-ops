# Governance Backfill Runbook

> Procedure for identifying and fixing existing tickets with governance violations.
> Apply when bulk-remediating historical issues after a governance standard change.
> See [governance-quality-checklist.md](governance-quality-checklist.md) for per-ticket standards.

## When to use this runbook

- After a new governance gate ships (e.g., megalint validators)
- After `signer-fidelity` lint detects historical client-identity violations
- When `governance-audit.js` surfaces an elevated violation rate
- Before a release to clear known defect backlog

## Prerequisites

- GitHub CLI (`gh`) authenticated to the target repo
- `node scripts/global/megalint/index.js` available in path
- Write access to issues on `chf3198/megingjord-harness`

## Step 1 — Identify violating tickets

Run the governance sweep to discover violators:

```bash
# List OPEN issues with potential signer-fidelity violations
gh issue list --repo chf3198/megingjord-harness --state open --limit 200 \
  --json number,title,body \
  | node -e "
    const {validate} = require('./scripts/global/megalint/signer-fidelity.js');
    const issues = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
    issues.forEach(i => {
      const r = validate({body: i.body || ''});
      if (!r.ok) console.log('#' + i.number, i.title.slice(0,60));
    });
  "
```

## Step 2 — Resolve alias for replacement

Check `inventory/team-model-signatures.json` for the correct worker alias.
Derivation rule (from `instructions/team-model-signing.instructions.md`):

| Team | Role | Alias |
|---|---|---|
| claude-code | manager | Cole Mason |
| claude-code | collaborator | Orla Harper |
| claude-code | admin | Nico Reyes |
| claude-code | consultant | Iris Vale |
| copilot | manager | Soren Mason |
| copilot | collaborator | Maya Harper |
| copilot | admin | Nico Reyes |
| copilot | consultant | Iris Vale |
| codex | manager | Finn Mason |
| codex | collaborator | Rowan Harper |
| codex | admin | Nico Reyes |
| codex | consultant | Iris Vale |

If the correct team/role is ambiguous, use the closest match based on the
surrounding artifact context (MANAGER_HANDOFF → manager alias, etc.).

## Step 3 — Apply the fix

For each violating issue, update the body replacing the client identity string:

```bash
ISSUE=1248
NEW_ALIAS="Orla Harper"
NEW_TEAM="claude-code:opus-4-7@anthropic"
NEW_ROLE="collaborator"

BODY=$(gh issue view $ISSUE --repo chf3198/megingjord-harness --json body -q .body)
FIXED=$(echo "$BODY" | sed \
  -e "s/Signed-by: Curtis Franks/Signed-by: $NEW_ALIAS/g" \
  -e "s/Team&Model: curtis-franks/Team\&Model: $NEW_TEAM/g")
gh issue edit $ISSUE --repo chf3198/megingjord-harness --body "$FIXED"
```

## Step 4 — Verify and document

After applying fixes, verify zero remaining violators:

```bash
gh issue list --repo chf3198/megingjord-harness --state open --limit 200 \
  --json number,body \
  | node -e "
    const {validate} = require('./scripts/global/megalint/signer-fidelity.js');
    const issues = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
    const bad = issues.filter(i => !validate({body: i.body||''}).ok);
    console.log(bad.length === 0 ? 'PASS: 0 violators' : 'FAIL: ' + bad.length);
  "
```

Document the backfill scope in the child ticket COLLABORATOR_HANDOFF comment
with: tickets fixed, aliases applied, verification method.

## Scope limits

Per AC9 of Epic #1407: OPEN priority tickets must be fixed in-session.
CLOSED tickets are audit-only — document findings; do not re-open solely for signing fixes.
