# Epic #1899 Phase-0 Research — Cross-Orchestrator Adversarial Red-Team Review Skill

**Author**: Orla Harper (claude-code:opus@local, role: collaborator-analyst)
**Date**: 2026-05-18
**Ticket**: Epic #1899 AC-R1 + AC-R2 (catalog + skill-overlap survey, with cutting-edge websearch evidence)
**Lane**: docs-research (no PR; this note IS the deliverable)

## §0 Question this research answers

Two questions per Epic #1899's scope and operator framing on 2026-05-18:

1. **What's the state of the art** in cross-orchestrator adversarial red-team analysis for agentic systems?
2. **Should the harness fold this into the existing cross-team consultant primitive, or stand it up as a parallel skill?**

## §1 State of the art (websearch evidence, 2024-2026)

### §1.1 Academic foundations

| Source | Contribution | Relevance to #1899 |
|---|---|---|
| **Du et al. 2024 + NeurIPS 2025 stability detection** | Multi-agent debate (MAD) — iterative refinement through structured deliberation | Already cited in harness `research/cross-team-rd-protocol-v2-2026-05-09.md` §0; foundation for Phase-D iterative debate |
| **CollabEval** (arxiv 2603.00993, Mar 2026) | 3-phase collaborative evaluation: initial-eval / multi-round-discussion / final-judgment. **Outperforms single-LLM judges** across coherence, relevance, fluency | Drop-in pattern for red-team-review's optional escalation phase |
| **DWC-MAD** (Springer 2026) | Dynamic Weighted Consensus integrating real-time confidence + longitudinal accuracy | Source of weights for judge-quorum aggregation |
| **Free-MAD** (arxiv 2509.11035) | Consensus-FREE MAD — score-based decision evaluates all intermediate results across rounds. Addresses **agent conformity** (LLMs tend to converge on majority answers, reducing accuracy) | Critical: avoid forcing consensus during adversarial review |
| **Preference Leakage** (arxiv 2502.01534, ICLR 2026) | Judges biased toward related student models. Three relatedness types: same-model, inheritance, same-family. **Confirms Epic #1612 cross-family rationale empirically** | Anchor citation for why red-team-review MUST use cross-family raters |
| **Agent-as-a-Judge survey** (arxiv 2601.05111, 2026) | Agentic judges with planning, tool-augmented verification, multi-agent collab, persistent memory — beyond LLM-as-judge | Architectural direction: red-team-review should be agentic, not stateless prompt |
| **Generative Adversarial Reviews (GAR)** (arxiv 2412.10415) | Reviewer personas + graph-based manuscript representation + external knowledge for novelty | Persona design pattern for differentiated specialist roles |
| **SafeReview** (arxiv 2604.26506, May 2026) | Defending LLM review systems against adversarial hidden prompts | Threat model — review system itself can be attacked |

### §1.2 Industry — multi-agent code review (2026 launches)

| System | Architecture | What it catches | Bias-resistance design |
|---|---|---|---|
| **Anthropic Claude Code Review** (Mar 9, 2026) | Multi-agent: each targets a different issue class (logic errors, boundary conditions, API misuse, auth flaws, project-convention compliance) | 84% bug detection on >1000-line PRs; lifted internal thorough-review rate 16% → 54% | Multi-agent dispatch + dedup + color-severity (red/yellow/purple) prioritization |
| **CodeRabbit** | Per-PR review bot; agentic code validation | General PR-style review (13M PRs reviewed cumulatively by 2026) | Single-vendor (hosted); not cross-family |
| **4-agent adversarial code review (heym)** (open-source, May 2026) | **Architect (orchestrator, can't author concerns) + Reasoner + Implementer + Reviewer** | Anti-deception ("behavior-altering refactors labeled as cleanup"); requires AFFIRMATIVE evidence of correctness | **Cross-lab models per specialist** (Anthropic + Google + Alibaba + Zhipu) — explicitly avoids "one LLM with clever prompt pretending to be three reviewers" |
| **claude-codex-collab** | Claude as PM + Codex as engineer; debate architecture + cross-review code | Cross-provider architectural review | Two-vendor by design |
| **swarm-orchestrator** | Copilot CLI + Claude Code + Codex backends; 8 quality checks gate merges | CI/CD-style verification across orchestrators | Parallel orchestrators; result-merge layer |

### §1.3 Compliance + threat landscape (2026)

- **NIST AI Agent Standards Initiative** (Feb 17, 2026) — 3 pillars: industry standards + open agent protocols (MCP) + agent identity research. Red-teaming framed as **mandatory for federal procurement**.
- **OWASP ASI 2026** — 10 agentic-app risk categories. Of direct relevance to #1899:
  - ASI07 Insecure Inter-Agent Communication (spoofed/manipulated agent comms)
  - ASI08 Cascading Failures (single-point fault propagation)
  - ASI02 Tool Misuse & Exploitation
  - ASI03 Identity & Privilege Abuse (delegated permissions / agent-to-agent trust)
- **Agent Cascading Injection** attack vector — malicious input/tool exploit at one agent cascades downstream. Red-team-review's check-catalog directly targets this surface.

### §1.4 Critical insight from the heym 4-agent system

> "Most 'agent reviews agent' implementations are one LLM with a clever prompt pretending to be three reviewers. The model can rubber-stamp itself. The 'concerns' are theatrical. The reviewer is the same brain that wrote the code."

This is the **central failure mode** the harness's existing `judge-quorum` already addresses (delta ≤ 0.10 across cross-family judges) but the current usage doesn't extend to the comment-level review skill space. The heym architect-can't-author rule is a primitive worth absorbing: in red-team-review, the orchestrator must produce findings from cross-family specialist evidence, never from its own generative output.

## §2 Existing harness assets to compose with

The harness already has substantial machinery from prior Epics:

| Asset | File / Epic | What it provides | Reuse in #1899 |
|---|---|---|---|
| Judge-quorum | `scripts/global/judge-quorum.js` (90 lines, Wave 1 #895) | Two-judge cross-family agreement (delta ≤ 0.10) with `escalate()` to 3rd family | Cross-family scoring of red-team findings |
| Cross-team queue | `scripts/global/cross-team-queue.js` (107 lines, #1305) | Substrate-aware queue resolver; atomic-claim via comment + label swap | Atomic-claim pattern for red-team-review work |
| Cross-team consult pickup skill | `.claude/commands/cross-team-consult-pickup.md` (46 lines) | Receiving-team protocol for Consultant closeout (regulatory baseline) | **Pattern for skill invocation contract; sibling skill, not replaced** |
| Multi-judge orchestrator | `scripts/global/multi-judge-orchestrator.js` (71 lines, Epic #1814) | Multi-judge dispatch + result aggregation | Direct compose for finding aggregation |
| Second-opinion runner | `scripts/global/second-opinion-runner.js` (Epic #1612) | HAMR-wrapped fleet rater (qwen2.5-coder:32b) + Tier-3 auto-file trigger when delta > 1.0 | Cross-family meta-review of red-team's own findings |
| Cross-Team R&D Protocol v2 | `research/cross-team-rd-protocol-v2-2026-05-09.md` | Phase-R/D/C protocol with substrate-first identity + iterative debate | Architectural sibling; same "iterative debate" backbone |
| Role-consultant-critique skill | `.claude/commands/...` (existing) | Independent post-execution rubric scoring | Distinct: rubric vs finding-list outputs |
| Anneal-trigger-router | `.claude/commands/anneal-trigger-router.md` | Classifies drift signals → Tier 1/2/3 | Red-team finding severity → tier routing |
| Cross-team lease + worktree isolation | Epic #1854/#1855/#1827/#1876 | Concurrent-session isolation | Red-team-review doesn't need write isolation; read-only |

## §3 Operator-prompted red-team patterns observed in 2026-05 sessions

Catalog of the 18+ distinct checks the operator-prompted reviewer has performed across `#1857` (Copilot Team red-team), `#1858`, `#1874` (Copilot completion-intent), `#1399` (research-first phase gate v1/v2/v3). These are the substrate of the skill's check-catalog:

| # | Check | Source memory note / Epic | Severity class |
|---|---|---|---|
| 1 | Cited PR is on `origin/main` (verify `gh pr view --json mergedAt`) | #1874 PR #1880 closed-unmerged trap | HIGH |
| 2 | Cited file paths exist in repo at PR HEAD | #1399 v2 remediation-files-uncommitted | HIGH |
| 3 | Signer alias is registry-derived from `inventory/team-model-signatures.json` | `feedback_signer_alias_derivation` | MEDIUM |
| 4 | Commit-message ticket refs match branch lead-N + PR Refs/Closes | #1399 commit (#1612) trap | HIGH |
| 5 | Lease worktree path matches lease ticket number | #1399 `/devenv-ops-copilot-1874` for #1399 lease | MEDIUM |
| 6 | AC checkboxes ticked at terminal status:done | #1407 contract; #1399 v1 5/5 unticked | MEDIUM |
| 7 | `test_strategy` declared in MANAGER actually exercised | #1399 v1 `drift-lint` declared, never invoked | MEDIUM |
| 8 | "Verbatim" claims literally identical (Unicode vs ASCII drift) | #1399 v1 `≥` → `>=` | LOW |
| 9 | Calendar thresholds replaced with velocity-relative | `feedback_calendar_thresholds_in_agentic_systems` | HIGH |
| 10 | Prose-collision protection (artifact-name strings, `role:NAME` colons, `Team&Model:` references in non-artifact prose) | `feedback_prose_collision_non_baton_comments` + others | MEDIUM |
| 11 | Anneal-decision `decision=file-ticket` cites real related #N | #1612 first-rater echoed scores; #1399 cited #1612 (unrelated) | HIGH |
| 12 | `incidents.jsonl` entry exists for cited pattern_id | #1399 hook-context-mismatch artifact-resolved-dangling | MEDIUM |
| 13 | Ambiguities in normative language (min/median/mean undefined) | #1399 v1 "across all G1-G9" undefined | MEDIUM |
| 14 | Path D anti-pattern (prose without enforcement) | `feedback_epic_ac_wording_vs_shipped_behavior` | HIGH |
| 15 | Composition coverage with related Epics named | #1399 v1 didn't compose with `evidence-completeness` | LOW |
| 16 | All 4 baton artifacts before PR creation | `feedback_all_baton_artifacts_before_pr` | HIGH |
| 17 | PR body Closes-keyword present (not just Refs) | `feedback_refs_ordering_in_pr_body` | HIGH |
| 18 | README/docs sync after package.json changes | recurring `docs-compile` failures | MEDIUM |
| 19 | Cross-family second-opinion run when consultant rubric ≥8 | Epic #1612 dogfood | LOW |
| 20 | Universality framing in critique (not a takedown) | Operator preference | LOW |

The 20 checks here mostly map to existing memory notes and Tier-2 anneal tickets I've filed (#1889-#1893, #1896-#1898) — meaning **the skill becomes a single entry point that invokes the underlying validators**, not a reimplementation.

## §4 Architectural options for #1899

### §4.1 Option A — Fold into cross-team consultant primitive

Make red-team-review a NEW phase of `cross-team-consult-pickup`: pre-claim adversarial-finding-list, then baton-Consultant rubric scoring.

**Pros**: Single skill family; shared infrastructure.
**Cons**: Conflates two activities. Cross-team consultant is **baton-bearing** (closes Epics with signer-substrate enforcement; regulatory baseline per #1305). Red-team-review is **observational** (no role transition, no Epic close authority). Mixing risks introducing baton transitions where none should occur.

### §4.2 Option B — Supersede cross-team consultant entirely

Argue red-team-review provides more independence than rubric scoring; make it canonical.

**Pros**: Simpler primitive.
**Cons**: Loses the SOX/DORA/ISO 27001 baseline-bearing function of cross-team consultant. Observations don't close Epics. Regulatory story breaks.

### §4.3 Option C — Compose as parallel skills (RECOMMENDED)

Two parallel skills with shared infrastructure:

| Skill | Purpose | Output | Authority | Lifecycle |
|---|---|---|---|---|
| `cross-team-consult-pickup` (existing) | Formal closeout review | `CONSULTANT_EPIC_CLOSEOUT` artifact + rubric ≥7 | Epic-close authority (regulatory baseline) | Triggered at `consultant:cross-team-needed` label; closes Epic on completion |
| `red-team-review` (new, #1899) | Adversarial finding-list at ANY lifecycle point | Numbered findings R1..RN + recommendations + signed-by + role-label-claimed | Observational (no baton transition; no role label) | Triggered by phrase `"perform red-team work on ticket #N"` or skill invocation; can run pre-merge, post-merge, mid-baton, or on closed tickets |

**Shared infrastructure**:
- `judge-quorum.js` for cross-family scoring (delta ≤ 0.10)
- `second-opinion-runner.js` for HAMR-wrapped fleet meta-review
- `cross-team-queue.js` for atomic claim when needed
- `inventory/team-model-signatures.json` for signer-substrate enforcement
- Tier-2 anneal-trigger-router for finding-severity → ticket-file routing

**Composition opportunities**:
- Cross-team consult Phase-1 (informal pre-claim) MAY auto-invoke red-team-review to surface findings before formal rubric scoring.
- Red-team-review finding-set with severity:HIGH MAY optionally trigger cross-team-consult pickup as escalation.
- Both feed Tier-2 anneal tickets per `anneal-trigger-router` classification.

## §5 Why Option C accelerates self-annealing

Per the operator's framing: red-team-review is potentially a **more optimal solution** for utilizing independent orchestrators to accelerate self-annealing. The composition path:

1. **Detection latency** drops. Currently, recurring traps (prose-collision, Refs/Closes ordering, calendar-threshold, completion-claim-without-merge, etc.) are surfaced when the operator notices them or when next-session bug-archeology finds them. Red-team-review applies the full 20-check catalog deterministically.
2. **Tier-2 anneal volume** rises proactively. Each red-team-review run can auto-file 0-N Tier-2 anneal tickets per HIGH-severity finding (per Epic #1308 contract). The harness self-anneals faster because findings are tracked at file-time, not session-end.
3. **Cross-family second-opinion** is invoked automatically (Epic #1612 composition). The red-team-review's own findings get scored by a fleet rater; any max_abs_delta > 1.0 triggers Tier-3 auto-file (Epic #1612 dogfood pattern).
4. **Less-capable Orchestrators** (Copilot auto-mode per session note) gain a structured external review they CANNOT skip. Programmatic governance enforced at skill-invocation time.

The cross-team consultant primitive is the **post-merge formal closeout** layer; red-team-review is the **mid/post-merge informal observation** layer. Both are needed; neither replaces the other.

## §6 Recommended Phase-1 children (to be filed after AC-R6 closeout)

Tentative implementation children for Phase 1 of #1899 (NOT to be filed until Phase-0 Consultant closes with rubric ≥7 — per #1399 phase-gate contract):

1. **Implement `.claude/commands/red-team-review.md`** — skill file with structured invocation contract (input: `#N` + optional `--depth`; output: numbered findings + recommendations + canonical signer).
2. **Implement `scripts/global/red-team-review-runner.js`** — orchestrator that invokes the 20-check catalog against a target ticket. Each check is a pure function with `(ticket_state, repo_state) → {ok, finding?}` shape.
3. **Integrate with judge-quorum + second-opinion-runner** — meta-review of own findings via HAMR-wrapped fleet rater (qwen2.5-coder:32b).
4. **Auto-file Tier-2 anneal for HIGH-severity findings** — compose with `anneal-trigger-router` skill.
5. **harness:self-test registry entry** — regression check using adversarial-fixture corpus (Epic #1875 stress-test mandate).
6. **Tests + stress test (perf budget p99 < 5s/ticket)** — Epic #1875 surface matrix applicability (adversarial-input parser + side-effect bearing via Tier-2 file path).
7. **Documentation in `instructions/`** — when to use red-team-review vs cross-team-consult.

## §7 Open research questions for AC-R3 / AC-R4 / AC-R5

- AC-R3 (invocation contract design): bash-CLI vs Skill-tool vs slash-command — which is most portable across claude-code / copilot / codex orchestrators?
- AC-R4 (data-source inventory): which read-only APIs are sufficient? `gh issue view`, `gh pr view --json`, `git log origin/main`, `gh api repos/...`, `~/.megingjord/incidents.jsonl` reader.
- AC-R5 (fleet integration design): does fleet rater rate the FINDING-LIST (yes/no agree with each finding) or the TICKET (independent rubric)? Recommend the former — meta-review of findings, not parallel rubric.

## §8 Decision

**Recommend Option C — parallel composition.** Red-team-review and cross-team-consult-pickup as parallel skills sharing infrastructure. Phase-1 implementation as scoped in §6. This aligns with:

- Operator usage pattern observed across this session (red-team invocation on closed Epics where consultant pickup wouldn't apply)
- The heym 4-agent system's architect-can't-author rule (apply to red-team-review's orchestrator role)
- Epic #1612's empirically-validated cross-family second-opinion pattern
- The harness's existing judge-quorum / multi-judge-orchestrator / cross-team-queue infrastructure
- Epic #1308 Tier-2 anneal contract (red-team findings become anneal tickets)
- Epic #1399 phase-gate (this Epic is research-first; Phase-1 gated on Phase-0 Consultant rubric ≥7 across G1-G9)

## §9 Sources

Academic:
- [Generative Adversarial Reviews: When LLMs Become the Critic](https://arxiv.org/abs/2412.10415)
- [Preference Leakage: A Contamination Problem in LLM-as-a-judge](https://arxiv.org/abs/2502.01534) — ICLR 2026
- [CollabEval: Enhancing LLM-as-a-Judge via Multi-Agent Collaboration](https://arxiv.org/abs/2603.00993) — March 2026
- [Free-MAD: Consensus-Free Multi-Agent Debate](https://arxiv.org/abs/2509.11035)
- [A Survey on Agent-as-a-Judge](https://arxiv.org/abs/2601.05111) — 2026
- [SafeReview: Defending LLM-based Review Systems Against Adversarial Hidden Prompts](https://arxiv.org/abs/2604.26506) — May 2026
- [Adversarial Robustness of LLM-Based Multi-Agent Systems for Engineering Problems](https://www.frontiersin.org/journals/artificial-intelligence/articles/10.3389/frai.2026.1784484/full)
- [Adversarial Attacks on LLM-as-a-Judge Systems](https://arxiv.org/abs/2504.18333)

Industry:
- [4-agent adversarial code review (heym, open-source, May 2026)](https://dev.to/frank_brsrk/i-open-sourced-a-4-agent-adversarial-code-review-team-any-coding-agent-can-call-it-as-an-mcp-36oe)
- [Anthropic launches code review tool to check flood of AI-generated code](https://techcrunch.com/2026/03/09/anthropic-launches-code-review-tool-to-check-flood-of-ai-generated-code/)
- [Anthropic Code Review Dispatches Agent Teams to Catch the Bugs That Skim Reads Miss](https://devops.com/anthropic-code-review-dispatches-agent-teams-to-catch-the-bugs-that-skim-reads-miss/)
- [The Code Agent Orchestra — Addy Osmani](https://addyosmani.com/blog/code-agent-orchestra/)
- [swarm-orchestrator (GitHub)](https://github.com/moonrunnerkc/swarm-orchestrator)
- [claude-codex-collab (GitHub)](https://github.com/AlessioZazzarini/claude-codex-collab)

Compliance + threat:
- [NIST AI Agent Security: Red-Teaming Guidance and Enterprise Compliance](https://labs.cloudsecurityalliance.org/research/csa-research-note-nist-ai-agent-red-teaming-standards-202603/)
- [OWASP Top 10 for Agentic Applications (2026)](https://www.aikido.dev/blog/owasp-top-10-agentic-applications)
- [Complete Guide to Agentic AI Red Teaming — DeepTeam](https://www.trydeepteam.com/guides/guide-agentic-ai-red-teaming)
- [Redefining AI Red Teaming in the Agentic Era: From Weeks to Hours](https://arxiv.org/abs/2605.04019)

Harness internal:
- `research/cross-team-rd-protocol-v2-2026-05-09.md`
- `~/.copilot/wiki/concepts/judge-quorum.md`
- `instructions/cross-team-consultant.instructions.md` (#1305)
- `.claude/commands/cross-team-consult-pickup.md`

---

Signed-by: Orla Harper
Team&Model: claude-code:opus@local
Role: collaborator
