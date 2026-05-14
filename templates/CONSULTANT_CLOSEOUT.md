# CONSULTANT_CLOSEOUT Rubric (AC4, #1555)

## Required Sections

- **Summary**: Concise statement of what was reviewed and the outcome.
- **Rubric Score**: Numeric score (1–10) per `role-consultant-critique` rubric. Must be ≥7 for peer-review/test-methodology-matrix compliance.
- **Evidence**: List of evidence reviewed (PRs, test runs, deploy logs, doc updates, etc.).
- **Mid-flight flaws accounting**: List any flaws recognized during review, with explicit decision (`file-ticket`, `log-incident-only`, `memory-note-only`, `no-action-justified`) and artifact reference.
- **anneal_tickets_filed**: List of any anneal/self-anneal tickets filed as a result of this review, or `none`.
- **Resolution**: Final closeout statement and any required follow-up.

## Example Template

```
## CONSULTANT_CLOSEOUT

**Summary:**
Reviewed PR #1556, all ACs met, no blocking issues found.

**Rubric Score:** 8/10

**Evidence:**
- PR #1556 merged
- CI green
- Deploy logs attached
- Docs updated (README, CHANGELOG)

**Mid-flight flaws accounting:**
- none

**anneal_tickets_filed:**
- none

**Resolution:**
All acceptance criteria satisfied. Issue closed per governance protocol.
```

---

- Use this template for all consultant closeouts.
- If any section is N/A, state explicitly (e.g., `Mid-flight flaws accounting: none`).
- Rubric score must be justified in the summary or evidence.
- See `instructions/role-baton-routing.instructions.md` and `test-methodology-matrix.instructions.md` for enforcement details.
