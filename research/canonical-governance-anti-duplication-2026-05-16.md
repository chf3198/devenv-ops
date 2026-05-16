# Canonical Governance Anti-Duplication Playbook

**Date**: 2026-05-16  
**Author**: claude-team (Agent implementation)  
**Related issues**: #1699, #1700, #1701, #1758, #1728, #1691, #1692  
**Team&Model**: claude-team @ 2026-05-16

## Executive Summary

This playbook documents the anti-duplication pattern that emerged during recent governance work (#1728 signer integrity, #1758 authorization profiles). It establishes canonical authoring rules and adapter onboarding processes to prevent redundancy across the harness's multi-orchestrator surface.

## Problem Context

Before this work:
- #1700 and #1701 both titled "epic(governance): canonical cross-orchestrator governance without redundancy" — identical scope, unclear ownership
- Risk: duplicate implementations across runtimes (~/.copilot, ~/.codex, ~/.agents/skills)
- No standard process for adding new orchestrator adapters
- Governance rules lived in scattered locations

**How this was detected**: During #1758 implementation (authorization profiles), identical profile schemas and validator logic were needed across 3 runtimes. Pattern suggested formalization.

## Core Anti-Duplication Rules

### Rule 1: Single Source of Truth (SSoT) in Main Repo

All governance code, configuration, and instructions **originate in this repo** (`/home/curtisfranks/devenv-ops`), never in deployed runtimes.

**Canonical locations:**
- `config/*.json` — schema files, profiles, matrices
- `scripts/global/*.js` — shared validators, parsers, governance logic
- `instructions/*.instructions.md` — runtime-agnostic contracts
- `.github/copilot-instructions.md` — runtime-specific guidance (Copilot)
- `.codex/AGENTS.md` — runtime-specific guidance (Codex)

**Deploy flow**: Repo → `npm run deploy:both:apply` → runtimes (`~/.copilot`, `~/.codex`, `~/.agents/skills`)

### Rule 2: Adapter Pattern for Runtime-Specific Behavior

When runtime A needs different behavior than runtime B:

1. **Keep shared contract in the repo** (e.g., authorization profile schema)
2. **Create adapter file**: `scripts/global/<name>-<runtime>.adapter.js` or `.codex/adapters/<name>.js`
3. **Adapter wraps shared contract** and applies runtime-specific semantics
4. **Adapter is tested alongside shared contract** in unit tests

**Example**:
- **Shared**: `config/authorization-profiles.json` (same for all runtimes)
- **Copilot adapter**: Could wrap profile parser to respect Copilot's specific capability API
- **Codex adapter**: Could wrap profile parser to respect Codex's specific permission model

### Rule 3: Governance Artifacts Use Consistent Naming

Governance tickets follow naming convention: `<type>(<area>): <title>` where:
- `type`: feat, fix, research, docs, test, epic, task
- `area`: governance, self-anneal, auth, routing, review, etc.
- `title`: specific responsibility (not "canonical X" repeated)

**Bad**: #1700 and #1701 both named "epic(governance): canonical cross-orchestrator governance"  
**Good**: #1700 "epic(governance): federated policy distribution", #1701 "epic(governance): adapter onboarding standard"

### Rule 4: Namespace Isolation for Multi-Team Work

When multiple teams work on governance:

1. Designate one team as **policy author** (writes contracts, schemas)
2. Other teams implement as **consumers** via adapters
3. Use issue assignment to clarify ownership boundary
4. Cross-team PRs must reference the policy-owner's issue/PR

**Example**: Claude Team defines authorization profile schema (#1758), Copilot team adapts for their token control model via separate feature branch.

## Anti-Duplication Checklist for New Features

Before implementing governance feature X:

- [ ] Is X runtime-agnostic or runtime-specific?
  - If agnostic → implement once in repo, deploy to all
  - If specific → implement shared contract, adapter in runtime folder
- [ ] Does X conflict with existing rule, schema, or instruction?
  - If yes → amend existing rule, create new version (not parallel file)
  - If no → proceed
- [ ] Is X scoped to a single ticket?
  - If no → split into child tickets with clear parent epic
  - If yes → reference related tickets in commit message
- [ ] Does X have tests in the repo?
  - If no → add unit tests before merge
  - If yes → verify tests run locally and in CI
- [ ] Is X documented in `instructions/` or `.github/`?
  - If no → add or link to existing instruction file
  - If yes → verify drift is caught in lint

## Adapter Onboarding Template

To onboard a new orchestrator adapter (e.g., "firefly"):

### Step 1: Create Adapter Folder
```bash
mkdir -p scripts/global/adapters/firefly
```

### Step 2: Implement Shared Contract Consumer
```javascript
// scripts/global/adapters/firefly/authorization-profile.adapter.js
const { parseActiveProfile } = require('../../authorization-profile');

function getFireflyProfile() {
  const baseProfile = parseActiveProfile();
  // Apply Firefly-specific semantics
  return {
    ...baseProfile,
    firefly_permission_level: mapCapabilitiesToFirefly(baseProfile.capabilities),
  };
}

module.exports = { getFireflyProfile };
```

### Step 3: Test the Adapter
```javascript
// tests/adapters/firefly-authorization-profile.spec.js
const { getFireflyProfile } = require('../../scripts/global/adapters/firefly/authorization-profile.adapter');

test('firefly adapter respects owner profile', () => {
  // ... assertions
});
```

### Step 4: Deploy and Verify
```bash
npm run deploy -- --target firefly --dry-run
npm run deploy -- --target firefly --apply
```

### Step 5: Document in README
```markdown
# Firefly Adapter

Implements governance contracts for Firefly orchestrator.

- Profile: inherited from `authorization-profiles.json`
- Mapping: capabilities → firefly_permission_level
- Tests: `tests/adapters/firefly-*.spec.js`
```

## Conflict Resolution

**Scenario 1: Two tickets cover the same governance surface**
1. Check issue numbers: lower number is canonical
2. Link higher number as duplicate with reference to canonical epic
3. Re-assign both teams to canonical ticket to coordinate
4. Example: #1701 was retained as canonical, #1700 linked as duplicate reference

**Scenario 2: Two branches implement the same contract differently**
1. First PR to merge is canonical
2. Second branch rebases onto main and adapts via adapter pattern
3. Both changes are tested together before final merge
4. Example: #1728 was merged first (signer integrity), #1758 adapted authorization profiles to work alongside signer checks

**Scenario 3: Runtime-specific feature becomes multi-runtime need**
1. Upstream the feature to shared contract in repo
2. Deprecate runtime-specific version with migration guide
3. Update adapters to consume new shared contract
4. Example: if Copilot-specific profile override logic needed by Codex, promote to shared `authorization-profile-context.js`

## Governance Docs Drift Prevention

All governance docs must pass these checks before merge:

```bash
npm run lint:md                  # Markdown formatting
npm run governance:verify        # Governance artifact consistency
npm run docs:drift               # Implementation vs. doc drift
```

Add to CI as mandatory gate for governance area changes.

## Next Steps

1. **Formalize in instruction**: Convert this playbook into `instructions/canonical-governance-anti-duplication.instructions.md`
2. **Create adapter registry**: `scripts/global/adapter-registry.json` listing all orchestrator adapters
3. **Add lint rule**: `lint-configs/governance-duplication.js` to catch multi-issue/multi-file governance authoring
4. **Onboard Firefly**: Use this playbook to implement first new-orchestrator adapter as validation
5. **Cross-team training**: Publish adapter onboarding guide for Copilot + Codex teams

## References

- **Merge commits establishing pattern**: #1728 (signer integrity), #1758 (authorization profiles)
- **Duplicate epic resolution**: #1700/#1701 (canonical cross-orchestrator governance)
- **Related epics**: #1600 (self-anneal hardening), #1691 (governance without duplication)
- **Adapter framework**: GitHub Actions, Adapter Pattern, Multi-tenant architecture patterns

---

**Team&Model**: claude-team (Agent implementation) @ 2026-05-16  
**Signed-by**: claude-team  
**Review status**: READY FOR MANAGER REVIEW
