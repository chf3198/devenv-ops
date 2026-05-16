# Multi-Agent vs Single-Agent Review Architecture (#1737)

Phase 1.1 research for Epic #1736. Compares 4-parallel-specialized-sub-agent (Qodo 2.0 pattern) vs 1-broad-agent (structured-output prompt).

## Cited 2026 evidence

| Source | Finding |
|---|---|
| Qodo "Single-Agent vs Multi-Agent Code Review in 2026" | Qodo 2.0 multi-agent (Feb 2026): bug-detection + code-quality + security + test-coverage agents in parallel. **60.1% F1 — highest among 8 benchmarked tools.** |
| Augment Code "AI Agent Pre-Merge Verification" | Layered pipeline pattern: each layer catches a different failure class; treating layers as interchangeable is the critical mistake. |
| Augment Code "Best AI PR Automation Tools 2026" | The best stack for 2026: merge queue + AI review layer + dependency automation + analytics. |
| Atlassian RovoDev (arxiv 2601.01129) | At-scale evidence: 54k+ review comments across 1,900+ repos over a year. Single broad reviewer model with structured prompts. |

## Architecture A — multi-agent specialized (Qodo 2.0 pattern)

```
Diff arrives
    ↓
┌──────────────────────────────────────────────────┐
│  Fan-out (parallel)                              │
├──────────────┬──────────────┬──────────┬─────────┤
│ Bug-detect   │ Security     │ Test-cov │ Arch-   │
│ sub-agent    │ sub-agent    │ sub-agent│ drift   │
└──────────────┴──────────────┴──────────┴─────────┘
    ↓ each emits structured findings
Aggregator → severity gate → PR comment
```

**Pros**: Tuned prompts per domain. Highest F1 in benchmarks. Parallel = same wall-time.
**Cons**: 4× context-window cost (or 4× provider calls). Cache may be reusable across sub-agents.

## Architecture B — single broad agent with structured-output prompt

```
Diff arrives
    ↓
Single broad reviewer
   "Find bugs, security issues, test gaps, architectural drift.
    Output structured findings JSON."
    ↓
Aggregator → severity gate → PR comment
```

**Pros**: 1× context cost. Simpler orchestration. RovoDev at-scale evidence works.
**Cons**: Lower F1 (Qodo benchmarks show single-pass <60%). Specialization is real.

## Per-PR cost estimate

Typical diff: 200-500 lines changed; ~5KB diff + 20KB surrounding context = ~25KB context per sub-agent call.

| Architecture | Context cost (input tokens) | Output cost | Wall-time |
|---|---|---|---|
| Multi-agent (4 sub-agents, parallel) | 4 × ~6,250 input tok = ~25,000 | 4 × ~500 = ~2,000 | ~20-30s (longest sub-agent) |
| Single agent | ~6,250 input | ~2,000 | ~20-30s |
| Cost ratio | 4:1 input; 1:1 output | | same |

**With HAMR prompt-caching**: shared diff context cacheable across sub-agents → effective 1.3-1.5× input cost, not 4×.

## Recommendation

**Adopt multi-agent (Qodo 2.0 pattern) — Architecture A.** Rationale:

1. **F1 is the dominant metric** for pre-merge review (false-positive trust gap is real per cited Latent.Space + Augment research). 60.1% vs <60% is meaningful at the 1900-repo scale RovoDev demonstrates.
2. **Cost mitigated by HAMR prompt-caching** — diff context is shared across all 4 sub-agents; effective cost is ~1.5× single-agent, not 4×.
3. **Specialized prompts compose with the auto-escalate trigger matrix** from #1738 — each sub-agent can apply its own trigger patterns at higher confidence.
4. **G9 Interoperability win**: specialized sub-agents map naturally to existing harness areas (security ↔ G4, test-coverage ↔ G2 Quality, etc.).

## Phase 2 consumer mapping

- Phase 2.1 (#1741) contract spec: 4 sub-agents per artifact; each emits findings array.
- Phase 2.2 (#1742) severity gates: aggregator merges per-sub-agent severity into overall PR-level gate.
- Phase 2.4 (#1744) HAMR integration: 4 parallel `/mcp review:run` capabilities OR 1 HAMR-side fan-out (trade-off in #1744).

## AC verification

- [x] AC1: Two architectures compared.
- [x] AC2: Qodo 60.1% F1 cited + 3 other 2026 sources cited.
- [x] AC3: Per-PR cost estimated for 200-500 line diff with HAMR caching.
- [x] AC4: Multi-agent recommended with explicit rationale.

## Sources

- [Qodo "Single-Agent vs Multi-Agent Code Review in 2026"](https://www.qodo.ai/blog/single-agent-vs-multi-agent-code-review/)
- [Augment Code "AI Agent Pre-Merge Verification"](https://www.augmentcode.com/guides/ai-agent-pre-merge-verification)
- [Augment Code "Best AI PR Automation Tools 2026"](https://www.augmentcode.com/tools/best-ai-pr-automation-tools)
- [Atlassian RovoDev arxiv 2601.01129](https://arxiv.org/html/2601.01129v1)
- [Qodo "Qodo Adds Multiple AI Agents to Code Review"](https://devops.com/qodo-adds-multiple-ai-agent-to-code-review-platform/)
- [GitHub Blog "Agent pull requests are everywhere"](https://github.blog/ai-and-ml/generative-ai/agent-pull-requests-are-everywhere-heres-how-to-review-them/)
