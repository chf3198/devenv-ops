---
on:
  pull_request:
    branches: [main]
    types: [opened, synchronize, reopened, ready_for_review]

permissions:
  contents: read
  issues: read
  pull-requests: read

engine: claude

tools:
  github:
    toolsets: [issues, pull_requests, context]

network: defaults

safe-outputs:
  add-comment:
    target: triggering
    max: 1

---

# model-diversity-advisory-aw

Pilot port of `.github/workflows/model-diversity-advisory.yml` to gh-aw
(GitHub Agentic Workflows) Markdown DSL. Mirrors Epic #1568 AC-3 / #1572
critical-path diversity check. Pilot per #1634.

## Goal

On every PR open/sync/reopen, verify that the four baton roles for the
linked issue carry distinct `Team&Model` substrate identifiers on the
critical path (Admin not equal Collaborator, Consultant not equal Admin).

Cross-model within the same provider passes (e.g. Opus vs Sonnet on
Anthropic). Advisory only — does not block merge.

## Instructions

1. Read the triggering PR's body. Find `Refs #<N>` in the body. If absent,
   write a summary line "skipped: no Refs found" and exit.
2. Read the linked issue #N. Read every comment on it.
3. From the comments, extract every block containing both `Role:` and
   `Team&Model:` structured fields. Collect a list of `(role, team_model)`
   tuples. Roles of interest: manager, collaborator, admin, consultant.
4. Apply the critical-path diversity rule:
   - admin must differ from collaborator on the `team` portion of
     `team:model@substrate` (cross-model within provider is allowed).
   - consultant must differ from admin on the `team` portion.
5. If any rule violates, post one comment to the triggering PR using the
   `add-comment` safe-output. Body MUST start with the HTML comment
   `<!-- model-diversity-advisory -->` so subsequent runs can detect it
   and avoid duplicate posts. Include the rule that failed and the
   advisory waiver path (label `model-diversity:waived` + rationale
   comment, or rotate the relevant role).
6. If no violation, write a summary line "model-diversity: PASS" and exit
   without commenting.

## Out of scope

- Blocking merge — this is advisory only during the soak.
- Cross-model-within-provider detection beyond the team field.
- Waiver-label processing — only the comment is posted; humans waive.

## Notes

- Compile with `gh aw compile` to produce the Actions workflow.
- Pilot soak: 7 days alongside the existing github-script workflow per
  #1634 AC3. Outcome decision per AC4 filed as follow-on.
- Compare outcomes by spot-checking 5+ PRs during the soak window.
