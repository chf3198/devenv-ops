# Research: Multi-Repo LLM Wiki Write Path

**Ticket**: #743
**Lane**: docs-research
**Date**: 2026-05-07
**Author**: Orla Harper (claude-code:opus-4-7@anthropic, role: collaborator)

## Executive recommendation

**Adopt the PR-back model via HAMR `/mailbox/write` proxy**, with `scripts/wiki/write-safety.js` providing in-flight coordination locks and `wiki/answers/*.md` (Karpathy 3rd-layer) as the per-repo write surface. Megingjord remains the single writer to canonical paths (`concepts/`, `entities/`); other repos write to a global `wiki/answers/` tier where provenance is enforced by frontmatter.

This recommendation is feasible **today** without new infrastructure — every primitive needed has shipped via Epic #866 (#871 write-safety, #1017 answers tier), Epic #860 (#918 HAMR mailbox), and Epic #1083 (broker for cross-host coordination).

---

## Context evolution since filing (2026-05-01 → 2026-05-07)

```
   At filing time (2026-05-01)              Today (2026-05-07)
   ─────────────────────────────            ────────────────────────────────
   No write-safety primitive                ✓ scripts/wiki/write-safety.js
                                              SHA-256 lock + 5-field provenance
   No cross-host coordination               ✓ scripts/global/broker.js
                                              lease registry + heartbeat
   No remote write proxy                    ✓ HAMR /mailbox/write
                                              signed envelope POST endpoint
   No answer-tier write surface             ✓ wiki/answers/ + scripts/wiki/answer.js
                                              long-lived synthesis with frontmatter
   Wiki retrieval was keyword-only          ✓ hybridSearch (BM25+RRF)
                                              from any repo can compose answers
   No multi-repo provenance pattern         ✓ frontmatter scheme for author/team/
                                              model/agent_role/commit established
```

The original #743 needed 8 design decisions; recent work answered or made trivial 5 of them.

---

## Per-question status

| Q | Question | Status | Evidence |
|---|---|---|---|
| Q1 | Governance model (federation vs PR-back) | DECIDED below | recommendation: PR-back |
| Q2 | Slug ownership (which repos own which paths) | DECIDED below | answer/sources are write-anywhere; concepts/entities are Megingjord-only |
| Q3 | Compile-time reconciliation | answered | hygiene scanners (#870) detect dupes/orphans; HAMR-wrap (#1082) emits cache-stats per provider |
| Q4 | MCP-as-write-path | answered | HAMR `/mailbox/write` (#918) ships A2A signed envelopes; wiki-write becomes a capability on this transport |
| Q5 | Conflict UX | partial | write-safety.js returns `{ok:false, reason:'held', existing}` — surface this in ticket comments + dashboard |
| Q6 | Read-write asymmetry | DECIDED below | hybrid: `concepts/`/`entities/` read-only from non-Megingjord; `answers/`/`sources/` write-via-mailbox |
| Q7 | Auth/authz | answered | write-safety.js validates 5-field provenance (author/team/model/agent_role/commit); HAMR mailbox uses Ed25519 DPoP |
| Q8 | Instruction evolution | DECIDED below | wiki-knowledge.instructions.md gets new "Write paths" section |

---

## Decision matrix (final)

| Pattern | Source-of-truth | Friction | Conflict freq | Install complexity | Replicability |
|---|---|---|---|---|---|
| **PR-back via HAMR mailbox** ★ | strong (Megingjord canonical) | low (single CLI call from any repo) | low (lock+lease) | medium (HAMR token required) | high (works for any harness-using repo) |
| Federation (per-repo wiki) | weak (drift inevitable) | very low | high (every repo merges) | high (compile pipeline rewrite) | medium |
| Hybrid (concepts read-only, answers write-anywhere) | strong | low for answers, normal for concepts | low | low (already shipped) | high |

**Winner: HYBRID PR-back via HAMR mailbox** — combines hybrid layer separation (Q6 answer) with PR-back governance (Q1 answer).

---

## Recommended architecture

```
   Any repo using the harness
       │
       │  npm run wiki:propose -- "page-slug" "draft content"
       ▼
   scripts/global/wiki-propose.js  (NEW, ≤100 lines)
       │
       │  1. Detect target tier from slug:
       │       answers/* | sources/*  → mailbox path (write-anywhere)
       │       concepts/* | entities/* → reject + offer PR-back path
       │  2. Acquire local lock via write-safety.acquireLock
       │  3. Stamp provenance frontmatter
       │  4. POST to HAMR /mailbox/write (signed envelope)
       │  5. HAMR mailbox accumulates proposals as JSONL
       ▼
   HAMR Worker /mailbox/write (#918)
       │
       │  R2 JSONL append (signed)
       ▼
   Daily Megingjord cron: npm run wiki:digest-mailbox
       │
       │  1. Fetch new mailbox entries
       │  2. Group by slug; resolve conflicts via lease records
       │  3. Run scripts/wiki/ingest.js on each grouped batch
       │  4. Open one PR per slug-cluster for Manager review
       ▼
   Megingjord PR (Manager + Consultant baton)
       │
       │  Standard wiki-edit baton (manager review;
       │  consultant approval; merge to wiki/)
       ▼
   Compiled wiki re-deployed to ~/.copilot/wiki/
```

---

## Slug ownership scheme (Q2 + Q6)

```
   Path                 Write surface          Who can write
   ─────────────────────────────────────────────────────────────
   wiki/concepts/*      Megingjord PR only     Manager (canonical concepts)
   wiki/entities/*      Megingjord PR only     Manager (canonical entities)
   wiki/syntheses/*     Megingjord PR only     Manager (cross-source synthesis)
   wiki/answers/*       Mailbox-via-HAMR       Any repo (Karpathy 3rd-layer)
   wiki/sources/*       Mailbox-via-HAMR       Any repo (raw research digests)
   raw/articles/*       Mailbox-via-HAMR       Any repo (pre-ingest research)
   wiki/index.md        Megingjord auto-update Manager (regenerated by ingest)
   wiki/log.md          Megingjord append-only Manager (audit log)
```

Rationale: the canonical knowledge graph (concepts/entities/syntheses) stays Megingjord-only because edit conflicts there compound — two repos disagreeing on what "baton-protocol" means is a governance failure. The answer-tier and sources-tier are write-anywhere because each entry is self-contained and provenance-stamped.

---

## Auth/authz (Q7) — already shipped

Provenance fields required by `write-safety.validateProvenance`:
- `author` — human alias (e.g., "Orla Harper")
- `team` — team identifier ("claude-code"|"copilot"|"codex"|"cursor")
- `model` — model identifier ("opus-4-7"|"gpt-5"|"qwen-3-235b")
- `agent_role` — baton role at time of write
- `commit` — git commit SHA at time of write

HAMR mailbox additionally requires Ed25519 DPoP signature on the envelope (per #918). This is multi-repo equivalent to the team-model-signing.instructions.md trailer requirement.

---

## Conflict UX (Q5)

Three layers:
1. **Pre-write**: `wiki:propose` calls `write-safety.acquireLock`. If held by another agent, returns `{ok:false, reason:'held', existing}`. Caller decides: wait, override, or abort.
2. **At ingest**: daily cron groups mailbox entries by slug. If multiple proposers wrote the same slug within the lock-TTL window, manager review surfaces the divergence.
3. **In dashboard**: future child surfaces lease state via `broker status --slug <slug>` (out of scope here; Wave-1.5 broker work).

---

## Instruction evolution (Q8)

`instructions/wiki-knowledge.instructions.md` Access Model table needs a new column for write surfaces:

```diff
   | Operation | Where | Command |
   |---|---|---|
   | **Search (compiled)** | Any repo | `node ~/.copilot/scripts/wiki-search.js "query"` |
   | **Read** | Any repo | Read `~/.copilot/wiki/index.md` then drill into pages |
   | **Search (source)** | Megingjord only | `npm run wiki:search -- "query"` |
   | **Ingest** | Megingjord only | `npm run wiki:ingest -- raw/articles/<file>.md` |
   | **Lint** | Megingjord only | `npm run wiki:lint` |
   | **Anneal** | Megingjord only | `npm run wiki:anneal` |
+  | **Propose answer/source** | Any repo | `npm run wiki:propose -- <slug> <content>` (writes to HAMR mailbox; daily Megingjord PR roundup) |
```

Plus a new "Write paths" section explaining the slug-ownership scheme above.

---

## Child ticket sketch (post-research)

| # | Effort | Description | Depends |
|---|---|---|---|
| 1 | 0.5d | `scripts/global/wiki-propose.js` — slug detection + provenance stamp + HAMR mailbox POST | — |
| 2 | 0.3d | `scripts/global/wiki-digest-mailbox.js` — daily cron; groups + opens Megingjord PR | Child 1 + HAMR mailbox |
| 3 | 0.2d | `instructions/wiki-knowledge.instructions.md` — add Propose row + Write-paths section | — |
| 4 | 0.2d | `wiki/concepts/multi-repo-write-path.md` — concept page documenting the architecture | Children 1-3 |
| **Total** | **~1.2d** | | |

This is feasible **today** because Children 1-3 are wrappers around already-shipped primitives (write-safety.js, HAMR mailbox, broker, answer-tier). No new infrastructure; just glue.

---

## Out-of-scope confirmations

- **Real-time CRDT** — confirmed out per original ticket scope.
- **Federation** — explicitly rejected per decision matrix; loses source-of-truth invariant.
- **GitHub-as-only-storage replacement** — kept; HAMR mailbox is auxiliary buffer, not replacement.
- **Cursor/Continue.dev adapter** — Wave-2 of broker work (#1083). Independent of #743 architecture.

---

## Conclusion

The original #743 research scope (filed 6 days ago) is now substantially answered by recent shipped work. The remaining decisions documented above can be implemented in ~1.2 days once Manager prioritizes. The recommended hybrid PR-back model preserves Megingjord's source-of-truth invariant while removing operator context-switch friction for the write surfaces (`answers/`, `sources/`, `raw/articles/`) where multi-repo writes are safe.

Wiki-knowledge.instructions.md evolution path is precise (single row addition + section). No further governance changes needed.

**Recommend closing #743 as research-complete.** Implementation tickets (Children 1-4 above) can be filed when the operator chooses to prioritize.
