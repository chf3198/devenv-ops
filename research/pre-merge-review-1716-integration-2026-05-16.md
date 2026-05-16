# Pre-Merge Review Integration with #1716 Rotation Contract (#1740)

Phase 1.4 research for Epic #1736. Validates that the new pre-merge review step composes cleanly with Epic #1716's just-shipped rotation contract.

## Existing #1716 contract recap

From `docs/howto/rotation-contract-v2.md` (#1719) shipped via PR #1731:

- **Rule 1** — Collaborator self-review: `collaborator_self_check.team` ≠ `implementation.team`
- **Rule 2** — Admin diversity: `admin.team` NOT IN `{manager.team, collaborator.team}`
- **Rule 3** — Consultant fully independent: `consultant.team` NOT IN any prior team

The validator (#1723 helper, #1724 HAMR adapter, #1735 worker route) consumes `roles_observed` records:

```js
{
  manager, collaborator, collaborator_self_check, implementation, admin, consultant
}
```

## Where the pre-merge reviewer slots

The new step lives between `COLLABORATOR_HANDOFF` and `ADMIN_HANDOFF`. Logical name: `COLLABORATOR_REVIEW` (final name TBD in #1741 contract spec).

The reviewer is **most analogous to Rule 2's Admin diversity**: their team must differ from Manager AND Collaborator. This matches the pre-merge-review intent (reviewer ≠ implementer's family).

## Proposed extension to roles_observed

Add a `reviewer` field:

```js
{
  manager,
  collaborator,
  collaborator_self_check,
  implementation,
  reviewer,           // NEW — pre-merge review step
  admin,
  consultant
}
```

## Proposed extension to rotation rules

Add a new rule (numbered Rule 4 to preserve existing rule numbering):

> **Rule 4 — Reviewer cross-family**: `reviewer.team` NOT IN `{manager.team, collaborator.team}`. Same constraint shape as Rule 2 (admin diversity).

In v2 helper terms (#1723), `checkRule4` mirrors `checkRule2`:

```js
function checkRule4(records) {
  if (!records.reviewer) return null;
  const rt = extractTeam(records.reviewer);
  const prior = [records.manager, records.collaborator].map(extractTeam).filter(Boolean);
  return rt && prior.includes(rt)
    ? { rule: 'rule_4_reviewer_cross_family', detail: `reviewer team '${rt}' appears in earlier role` }
    : null;
}
```

## Validator extension required (small)

| Component | Change required |
|---|---|
| `scripts/global/baton-team-model-v2.js` (#1723) | Add `checkRule4`; update `enforceRotationV2` to call it; update `extractRecordsFromComments` to handle the new artifact header (`COLLABORATOR_REVIEW` or final name). |
| `scripts/global/hamr-rotation-check.js` (#1724) | Adapter passes the new record-shape through unchanged (it's already roles_observed dict-shape). |
| `cloudflare/hamr/routes/rotation-check.ts` (#1735) | TS mirror of `checkRule4`. |
| `.github/workflows/rotation-advisory.yml` (#1735) | No change — workflow already reads from `extractRecordsFromComments`. |

**Estimated extension effort**: ~30 lines of helper + 30 lines of TS + a handful of new unit tests. Modest.

## Does the rotation contract work out-of-the-box for the new step?

**Not quite** — Rule 2 currently checks Admin only against Manager/Collaborator. For a reviewer step, we need either:

- **Option A**: Re-use Rule 2's logic for the new step (just add a parallel rule with different field names). Recommended above.
- **Option B**: Generalize Rule 2 to "any review-class role must differ from prior implementation roles". Cleaner architecturally; bigger refactor.

**Recommend Option A** for Phase 3 implementation. Option B can be a later refactor if more review-class roles appear.

## HAMR `/mcp` capability shape

The existing `/mcp rotation:check` capability accepts `roles_observed`. The new role just appears as a new field. **No new HAMR capability required** — the existing rotation:check route handles it as long as the v2 helper is extended (per above).

Phase 2.4 (#1744) HAMR integration spec confirms the new `/mcp review:run` capability is for **executing the sub-agent review**, NOT for rotation enforcement. The two capabilities are orthogonal:
- `rotation:check` (existing) — validates Team&Model rotation across baton roles
- `review:run` (new in Phase 3) — runs the 4 sub-agents and emits findings

Both can fire on the same PR-event; they're independent gates.

## Artifact header naming

Current baton artifacts:
- `MANAGER_HANDOFF`
- `COLLABORATOR_HANDOFF`
- `COLLABORATOR_SELF_CHECK` (defined in v2 contract, not yet emitted in practice)
- `ADMIN_HANDOFF`
- `CONSULTANT_CLOSEOUT`

For the new step, candidate names: `COLLABORATOR_REVIEW`, `PRE_MERGE_REVIEW`, `REVIEW_HANDOFF`, `REVIEWER_FINDINGS`.

**Recommend `REVIEWER_FINDINGS`** because:
- Distinct from existing 5 artifact types (no regex collision with closeout-schema validators).
- Name describes the artifact content (structured findings, not a generic handoff).
- Phase 2.1 contract spec (#1741) can finalize.

## AC verification

- [x] AC1: Flow traced — new step between Collaborator and Admin, parallel to Rule 2's Admin diversity check.
- [x] AC2: Rule 2 identified as the analog; new Rule 4 proposed with same shape.
- [x] AC3: Validator needs modest extension (~30 lines helper + ~30 lines TS); not a redesign.
- [x] AC4: New artifact slots into `extractRecordsFromComments` with one new conditional branch.
- [x] AC5: HAMR `/mcp rotation:check` shape compatible; new `/mcp review:run` is orthogonal (Phase 2.4).

## Phase 2 consumer mapping

- Phase 2.1 (#1741) contract spec: adopts `REVIEWER_FINDINGS` artifact name and Rule 4 addition.
- Phase 2.4 (#1744) HAMR integration: confirms `review:run` is orthogonal to `rotation:check`.
- Phase 3.1 (#1752) helper extension: adds `checkRule4` + extractRecordsFromComments branch.

## Sources

- Existing harness: `docs/howto/rotation-contract-v2.md` (#1719); `scripts/global/baton-team-model-v2.js` (#1723); `cloudflare/hamr/routes/rotation-check.ts` (#1735).
- Referenced Epic #1716 children: #1717, #1718, #1719, #1720, #1721, #1722, #1723, #1724, #1735.
