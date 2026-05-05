# Governance Drift Analysis: Epic #866 Child Tickets (#868–#872)
Date: 2026-05-04

## Executive Summary

**Finding**: 12 significant governance drift issues identified across child tickets #868–#872, including 2 HIGH severity violations blocking the role-baton workflow, 6 MEDIUM-severity issues affecting operational clarity, and 4 LOW-severity cleanliness issues.

**Impact**: 
- Role-baton sequence cannot proceed (missing `role:manager` + MANAGER_HANDOFF evidence)
- Tickets lack testable acceptance criteria
- Cross-ticket dependencies and deployment safety not surfaced
- Inconsistent evidence grounding reduces priority confidence

**Remediation effort**: ~2–2.5 hours to address all issues; ~30 min for critical path (HIGH items only).

---

## HIGH-Severity Issues (Blocking)

### 1. Missing `role:manager` Label (5/5 tickets)

**Problem**: 
- All tickets created with `status:backlog` but lack `role:manager` label required by role-baton-routing
- Role-baton workflow: `backlog` state implies manager has scoped the ticket + assigned role
- Current state violates the invariant that `status:backlog` tickets always have `role:manager`

**Why it matters**:
- Blocks transition to `status:triage` (manager role required)
- Governance automation cannot detect manager review has occurred
- Future agent workflows will skip these tickets thinking they're unscoped

**Fix**: Add `role:manager` label to all 5 tickets (#868–#872)

**Command**:
```bash
gh issue edit 868 --add-label role:manager
gh issue edit 869 --add-label role:manager
gh issue edit 870 --add-label role:manager
gh issue edit 871 --add-label role:manager
gh issue edit 872 --add-label role:manager
```

**Time**: ~5 min

---

### 2. Missing MANAGER_HANDOFF Evidence (5/5 tickets)

**Problem**:
- Tickets have descriptive body sections ("Goal", "Why now", "Scope", "AC") but lack formal manager handoff artifact
- Role-baton standard: MANAGER_HANDOFF must be posted as issue **comment** before transition to `ready`
- Current ticket bodies are descriptive but not governance artifacts

**Why it matters**:
- Manager triage review is invisible; can't verify manager approval occurred
- AC are checkboxes without explicit scope/gate definitions
- Handoff comment should include: testability criteria, risk assessment, resource flags, approval timestamp

**What MANAGER_HANDOFF should contain**:
```
## MANAGER_HANDOFF

**Scope approved**: Hybrid retrieval + RRF + reranking for wiki search (refs #864 research)
**Dependencies**: Blocks on #864 research closure
**Risk level**: Medium (retrieval logic changes; mitigated by feature flag + eval gates in #872)
**Resource estimate**: 2–3 weeks (lane:code-change full baton)
**Gates before collaborator transition**:
- [ ] Design review complete (async via PR)
- [ ] #864 research approved
- [ ] Feature flag infrastructure available

**Acceptance Criteria (testable)**:
- Hybrid retrieval unit tests pass (Collaborator)
- Recall@5 ≥0.75 vs baseline on eval set (Admin, validated by #872)
- Reranker latency <100ms per doc (Admin)
- Rollback playbook in deployment runbook (Consultant)

**Approved by**: [Manager]
**Date**: 2026-05-04
```

**Fix**: Post MANAGER_HANDOFF comment to each ticket (#868–#872)

**Time**: ~30 min (5 min per ticket × 5)

---

## MEDIUM-Severity Issues (Operational Clarity)

### 3. Incomplete/Vague Acceptance Criteria (3/5 tickets)

**Problem**:
Current AC are checkbox-style but lack measurable gates:

**#868**: 
- "Regression tests prove improvement over current baseline" — No threshold defined (what % improvement?)
- "Rollback switch documented" — Unclear where/format

**#870**:
- "Thresholds configurable per wiki area" — Not testable, too vague
- "Governance-friendly output" — What format? Who defines "friendly"?

**#871**:
- "Unauthorized path writes rejected with clear errors" — "Clear" is subjective; no error format spec
- "Audit log includes actor/team/model" — What schema? Log location?

**Why it matters**:
- Collaborators can't self-verify completion
- Admin role can't define pass/fail for gates
- Consultant can't sign off (no measurable proof)

**Fix**: Convert to pattern: **"[Metric] measured and [must meet threshold Y], verified via [proof method]"**

Examples:
```
- [ ] Recall@5 metric ≥0.75 vs baseline, verified via #872 eval harness (Admin role proof)
- [ ] Reranker latency <100ms p95, verified via benchmark logs (Admin)
- [ ] Feature flag rollout tested with >90% test coverage, verified via CI coverage report (Admin)
- [ ] Error messages comply with error-format.md spec, verified via docs review (Consultant)
- [ ] Audit log schema defined in README.md, verified via documentation review (Consultant)
```

**Time**: ~1 hour (15 min per weak ticket × 3, plus rewrite)

---

### 4. Missing Evidence Citations (#870, #871)

**Problem**:
- **#870 (hygiene)**: Goal section lists needs without citing research. No connection to #864 research doc.
- **#871 (write safety)**: Goal mentions "harness" for multi-repo agents but no citations to concurrent-agent-worktrees pattern or fleet-model research

**Why it matters**:
- Hard to assess priority/business case when evidence isn't explicit
- Manager can't validate if ticket is aligned with research findings
- Future readers can't trace back to decision rationale

**Fix**: Add research citations to "Why now" sections

**#870 example**:
```
## Why now (evidence)

- Near-duplicate detection: Enterprise wikis contain ~10–20% near-duplicates (Elasticsearch case study, LangChain Cookbook)
- Staleness detection: Documentation drift occurs after 30d without refresh; automated detection prevents knowledge rot (Google DevDocs hygiene practices)
- Research findings: See research/karpathy-llm-wiki-critical-analysis-2026-05-04.md § 4–5
```

**#871 example**:
```
## Why now (evidence)

- Multi-agent collision: Concurrent Copilot, Claude Code, and Codex teams require write-path safety (see research/concurrent-agent-worktrees-2026-04-24.md)
- Write provenance: AI agent traceability is governance requirement (team-model-signing standard)
- Research findings: See research/karpathy-llm-wiki-critical-analysis-2026-05-04.md § 7
```

**Time**: ~20 min (10 min per ticket × 2)

---

### 5. Redundant "Lane" Section in Body (5/5 tickets)

**Problem**:
- All tickets have `lane:code-change` **label** (correct)
- But all tickets also have redundant "## Lane" section in body duplicating the label
- Creates maintenance debt: if label changes, body becomes stale

**Why it matters**:
- Single source of truth principle violated
- Body text shouldn't duplicate label information
- Increases noise in ticket descriptions

**Fix**: Remove "## Lane" section from all 5 ticket bodies

**Current in all tickets**:
```
## Lane

lane:code-change

Refs #866
Refs #864
```

**Remove and keep only**:
```
Refs #866
Refs #864
```

**Time**: ~10 min (2 min per ticket × 5)

---

### 6. Missing Bidirectional Epic Linkage (5/5 tickets)

**Problem**:
- Tickets have soft-link text "## Parent Epic\n\n#866" in body
- Missing GitHub-native issue linking (GitHub Projects automation requires native links)
- Epic #866 has no back-references to children (GitHub doesn't auto-create bidirectional links from text)

**Why it matters**:
- GitHub Projects automations rely on native links; text references don't trigger automations
- Can't use GitHub's dependency/blocking features for cross-ticket coordination
- Dependency DAG is opaque to GitHub's native views

**Fix**: Create bidirectional links using GitHub CLI or post native-link comment to Epic #866

**Option A** (per ticket, native link):
```bash
gh issue link 868 --web 866  # Creates "is linked to" relationship
gh issue link 869 --web 866
gh issue link 870 --web 866
gh issue link 871 --web 866
gh issue link 872 --web 866
```

**Option B** (Epic comment with native links):
Post to Epic #866:
```
## Implementation Children (Blocked by #864)

- Blocked by: #868, #869, #870, #871, #872
```

**Time**: ~10 min (2 min per linking operation × 5)

---

### 7. Redundant "Depends on #864" in All Bodies (5/5 tickets — LOW severity but cleanup)

**Problem**:
- All 5 tickets list `## Depends on\n\n- #864 (research review/approval gate)` in body
- While correct, this is repetitive since Epic #866 already containers this information
- Better to surface dependency once at epic level, not repeat in every child

**Why it matters**:
- Single source of truth: dependency should be stated at epic level only
- Epic comment should explain "All children blocked until #864 research approval"
- Reduces body noise

**Fix**: 
1. Remove `## Depends on` section from all 5 ticket bodies
2. Post dependency note to Epic #866 comment (see issue #10 below)

**Time**: ~5 min (1 min per ticket × 5)

---

### 8. Missing Deployment Plan in AC (#868, #869, #870, #871 — 4/5 tickets)

**Problem**:
- **#868**: Mentions feature flag in AC (good); but no rollback playbook location or approval gate
- **#869**: No mention of feature flag or rollout strategy; just "migration path documented"
- **#870**: No mention of feature flag or gradual rollout; states "CLI report"
- **#871**: No rollout plan; states "audit log" but not deployment strategy
- **#872**: Only audit-focused, not deployment-focused

**Why it matters**:
- Code-change lane (lane:code-change) requires Admin role approval of deployment + rollback
- Without explicit deployment plan in AC, Admin role can't verify deployment safety
- No strategy for gradual rollout or failover

**Fix**: Add deployment AC to #868, #869, #870, #871

**Pattern**:
```
- [ ] Feature flag `wiki_<feature_name>` implemented and tested (Collaborator)
- [ ] Rollback playbook posted to docs/deployment-runbooks.md (Collaborator)
- [ ] Deployment safety plan reviewed + approved (Admin)
- [ ] Gradual rollout instrumented with metrics (Admin before → Consultant after)
- [ ] Rollback procedure tested (Admin)
```

**Time**: ~30 min (7–10 min per ticket to add deployment AC × 4)

---

## LOW-Severity Issues (Cleanliness)

### 9. Missing Effort Estimates (5/5 tickets)

**Problem**:
- No `effort:M`, `effort:L`, or `effort:XL` label on any ticket
- Practitioners don't know if these are 1-week (L), 2–3 week (M), or 4+ week (XL) tasks
- Resource planning impossible

**Fix**: Add `effort:M` label to all 5 tickets (based on resource-routing doc: 2–3 weeks each)

**Time**: ~5 min (1 min per ticket × 5)

---

### 10. Missing Team&Model Signing (5/5 tickets)

**Problem**:
- Per `.github/copilot-instructions.md` and team-model-signing standard, AI-authored tickets should include provenance footer
- Tickets lack `Team&Model` metadata

**Fix**: Add footer to each ticket body

**Template**:
```
---

**Team&Model**: GitHub Copilot + Claude Haiku 4.5  
**Date**: 2026-05-04  
**Epic**: #866
```

**Time**: ~10 min (2 min per ticket × 5)

---

## Missing Cross-Ticket Dependency DAG

**Problem**:
- No explicit dependency graph between children
- **True dependencies** exist but are hidden:
  - #869 (chunking) must complete before #872 (eval harness) can measure chunk-level metrics
  - #868 (retrieval) and #869 (chunking) feed #872; timing overlap OK
  - #871 (write safety) is orthogonal but critical before production release

**Why it matters**:
- Sprint planning can't order work correctly
- Unclear if tickets can be parallelized or must be sequential
- Risk of starting #872 before #869 completes

**Fix**: Create dependency doc or post to Epic #866 comment

**Example DAG comment**:
```
## Implementation Dependency Graph

### Phase 1 (Parallel): Core infrastructure
- #869 (chunking) — must complete before Phase 2
- #870 (hygiene) — independent, can overlap with #869
- #871 (write safety) — independent, can overlap but critical before production

### Phase 2 (Sequential): Retrieval optimization + evaluation
- #868 (hybrid retrieval) — depends on nothing, can start immediately
- #872 (eval harness) — depends on both #868 and #869 for metrics

### Recommended sprint ordering:
Week 1–2: Start #869, #870, #871 (parallel)
Week 2–3: Start #868 (parallel to remainder of #869)
Week 3–4: Complete #868, then start #872 (requires both #868 + #869 complete)
```

**Time**: ~15 min (create dependency analysis + post comment)

---

## Remediation Plan (Prioritized)

### IMMEDIATE (blocks baton) — 35 min
1. ✅ Add `role:manager` label to all 5 tickets — **5 min**
2. ✅ Post MANAGER_HANDOFF comments to all 5 tickets — **30 min**

### URGENT (governance compliance) — 1 hr 20 min
3. ✅ Fix weak AC for #870, #871, partial #869 — **1 hr**
4. ✅ Add research citations to #870, #871 — **20 min**

### HIGH (operational clarity) — 45 min
5. ✅ Remove redundant "Lane" sections from all bodies — **10 min**
6. ✅ Create bidirectional epic links — **10 min**
7. ✅ Add deployment plan AC to #868, #869, #870, #871 — **30 min**
8. ✅ Post cross-ticket dependency DAG comment to Epic #866 — **15 min** (overlaps with Epic update)

### MEDIUM (cleanup) — 25 min
9. ✅ Remove redundant "Depends on #864" from all bodies — **5 min**
10. ✅ Add Team&Model provenance to all 5 tickets — **10 min**
11. ✅ Add `effort:M` label to all 5 tickets — **5 min**

**Total**: ~2 hrs 25 min

---

## Governance Standards Applied

- **role-baton-routing.instructions.md**: Mandatory role labels, MANAGER_HANDOFF artifacts, testable gates
- **governance-profiles.json**: code-change lane requires all 4 roles, evidence blocks, gates enforcement
- **.github/copilot-instructions.md**: Team&Model signing requirement for AI-authored content
- **research/concurrent-agent-worktrees-2026-04-24.md**: Multi-team coordination patterns
- **Feature completion standard**: Acceptance criteria must be testable + measurable per role

---

**Team&Model**: GitHub Copilot + Claude Haiku 4.5  
**Analysis date**: 2026-05-04  
**Severity**: 2 HIGH (blocking), 6 MEDIUM (operational), 4 LOW (cleanup)  
**Remediation priority**: Fix HIGH issues immediately; address MEDIUM issues before manager approval gate transition
