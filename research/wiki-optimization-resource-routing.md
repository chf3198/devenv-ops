# Fleet Resource Routing: Karpathy LLM Wiki Optimization (#866)
Date: 2026-05-04

## Executive Summary

Epic #866 (child tickets #868–#872) requires heavy compute for reranking, embedding generation, semantic similarity, and eval benchmarking. This document routes tasks to fleet resources (Tailscale GPU cluster, cloud APIs) to minimize Copilot token usage while meeting quality targets.

**Token Budget Strategy**:
- Copilot: Orchestration, synthesis, quality gates (≤80% of sprint budget)
- Fleet: Compute-heavy inference, ranking, similarity checks (remainder)

---

## Fleet Resources Overview

### Tier 1: Local (Zero-latency, Reserved)
- **36gbwinresource** (Tailscale): GPU cluster for embedding generation, dense retrieval, local inference
- **OpenClaw** (Tailscale): Custom concurrency harness, write-safety validation, stress testing
- Availability: Reserved for critical path items
- Cost: Amortized; already deployed

### Tier 2: Cloud APIs (Low-cost, High-throughput)
- **OpenRouter** (via .env): Multi-model endpoint (defaults to best-price model for category)
- **Groq** (via OpenRouter): ~500 tok/sec latency, excellent for reranking + batch inference
- **Cerebras** (via OpenRouter): Competitive pricing, alternative if Groq rate-limited
- **Google AI Studio** (free tier): Semantic similarity baselines, non-critical batches
- Availability: API keys in `.env`; consume via `scripts/global/fleet-router.js`
- Cost: Pay-per-token; track in `logs/wiki-optimization-resource-usage.jsonl`

### Tier 3: Alternative (Fallback)
- OpenAI, Anthropic (Claude): Premium pricing; avoid unless critical path blocked
- Cost: 2–3× higher than Groq/Cerebras

---

## Per-Ticket Resource Allocation

### #868: Hybrid Retrieval + RRF + Reranking

**Primary tasks**:
1. Dense retrieval (embedding-based search)
2. Sparse retrieval (BM25 search)
3. RRF fusion (rank combining)
4. Reranking (cross-encoder scoring)

**Resource assignment**:

| Task | Primary | Secondary | Fallback | Estimate |
|---|---|---|---|---|
| Embedding generation (dense index) | 36gbwinresource | Groq | Cerebras | 2h (GPU compute) |
| BM25 indexing (sparse search) | Local CPU | — | — | 0.5h (I/O) |
| RRF fusion algorithm | Copilot (orchestration) | — | — | 0.1h (compute-trivial) |
| Reranking (cross-encoder) | Groq (batch) | Cerebras | OpenRouter-default | 1h (token cost ~500K) |

**Implementation pattern**:

```javascript
// skills/wiki-retrieval-hybrid.md
## Hybrid Retrieval Skill

Use case: Search LLM wiki with density + lexical coverage

Algorithm:
1. Dense retrieval: Query → embedding (36gbwinresource) → top-50 docs by cosine
2. Sparse retrieval: Query → BM25 analysis (local CPU) → top-50 docs by TF-IDF
3. RRF fusion: Combine rankings (Copilot, orchestration-only)
   - Score = 1/(k + rank_dense) + 1/(k + rank_bm25); k=60
   - Result: top-20 fused candidates
4. Reranking: Fused top-20 → cross-encoder (Groq via OpenRouter)
   - Model: BGE-reranker-v2-m3 or Cohere-rerank-3-english
   - Result: top-5 final candidates for LLM synthesis

Copilot responsibility:
- Validate reranker response (scores normalized, no NaNs)
- Filter candidates by threshold (score > 0.5)
- Synthesize answer with grounding evidence
```

**Token tracking**: Log reranking tokens to `logs/wiki-optimization-resource-usage.jsonl`
- Record: `{ timestamp, ticket: 868, task: "reranking", tokens_used, model: "groq/bgm-reranker-v2-m3", cost }`

---

### #869: Context-Aware Chunking + Parent-Context Expansion

**Primary tasks**:
1. NLP-based document chunking (sentences, small paragraphs)
2. Generate dense embeddings for chunks
3. Retrieve parent/section context during inference

**Resource assignment**:

| Task | Primary | Secondary | Fallback | Estimate |
|---|---|---|---|---|
| NLP parsing (sentence splitter) | Copilot (Python + spaCy) | — | — | 0.5h (local compute) |
| Dense embedding generation | 36gbwinresource (GPU batch) | Groq | Cerebras | 4h (GPU-intensive) |
| Parent-context metadata indexing | Local I/O | — | — | 1h (disk write) |
| Inference: retrieve + expand | 36gbwinresource (retrieval) | OpenRouter (fallback) | — | Per-query (ms) |

**Implementation pattern**:

```javascript
// scripts/wiki-chunking-npl-windows.js

const chunker = new LlamaIndexChunker({
  strategy: "sentenceWindowNodeParser",
  window_size: 5,              // context window: 5 sentences before/after
  overlap: 2,                  // boundary overlap for coverage
});

const chunks = chunker.split(wikiDocs);
// Output: { id, text, window_context, section, parent_doc, embedding }

// Embedding generation (batch to 36gbwinresource)
const embeddings = await embeddingClient.batchEmbed(chunks, {
  model: "all-MiniLM-L6-v2",
  server: "36gbwinresource",
  batch_size: 100,
  timeout: 300,  // 5 min per batch
});

// Store: { chunk_id, vector, window_context, parent_pointer }
await vectorStore.index(embeddings);
```

**Token tracking**: Embedding generation is compute-heavy but low-token-cost
- Record: `{ timestamp, ticket: 869, task: "embedding", docs_processed, vectors_generated, server: "36gbwinresource" }`

---

### #870: Wiki Hygiene Scanners (Dedup, Staleness, Orphan Detection)

**Primary tasks**:
1. Near-duplicate detection (embedding similarity)
2. Staleness detection (timestamp comparison)
3. Orphan page detection (in-degree graph analysis)
4. Cross-link weakness scoring

**Resource assignment**:

| Task | Primary | Secondary | Fallback | Estimate |
|---|---|---|---|---|
| Embedding similarity (dedup) | Google AI Studio (batch) | Groq | Cerebras | 1h (free tier) |
| Staleness comparison (metadata) | Copilot (local logic) | — | — | 0.2h (compute-trivial) |
| Orphan detection (graph traversal) | Copilot (local compute) | — | — | 0.3h (O(V+E)) |
| Cross-link scoring (semantic similarity) | Google AI Studio (free) | Cerebras | — | 1h (low-priority) |

**Implementation pattern**:

```javascript
// scripts/wiki-hygiene-scanner.js

// 1. Dedup: Batch embeddings to Google AI Studio (free tier, non-blocking)
const documents = await wiki.loadAll();
const embeddings = await googleAI.embedBatch(documents.map(d => d.text), {
  model: "embedding-001",
  batch_size: 500,
});

// Find clusters: cosine_similarity > 0.95
const duplicates = findClusters(embeddings, { threshold: 0.95 });
// Output: [ { cluster_id, docs: [doc_A, doc_B, ...], suggested_merge_target } ]

// 2. Staleness: Local timestamp comparison
const stalePages = documents.filter(d => {
  const age = Date.now() - d.last_verified;
  return age > STALENESS_THRESHOLDS[d.type]; // e.g., 30 days for evergreen, 7 days for logs
});
// Output: [ { doc_id, age_days, last_verified, status: "stale" } ]

// 3. Orphans: Graph in-degree analysis
const inDegrees = computeInDegrees(documents); // count incoming links
const orphans = documents.filter(d => inDegrees[d.id] === 0);
// Output: [ { doc_id, in_degree: 0, suggestion: "add backlinks or deprecate" } ]

// 4. Weak links: Semantic similarity recommendations
const weakLinks = [];
for (const doc of documents) {
  for (const link of doc.links) {
    const similarity = cosineSim(embeddings[doc.id], embeddings[link.target_id]);
    if (similarity < 0.5) { // weak semantic connection
      weakLinks.push({ source: doc.id, target: link.target_id, similarity });
    }
  }
}

// Write reports to /research/wiki-hygiene-reports/
fs.writeFileSync("dedup-clusters.json", JSON.stringify(duplicates, null, 2));
fs.writeFileSync("stale-pages.json", JSON.stringify(stalePages, null, 2));
fs.writeFileSync("orphan-pages.json", JSON.stringify(orphans, null, 2));
fs.writeFileSync("weak-links.json", JSON.stringify(weakLinks, null, 2));
```

**Token tracking**: 
- Google AI Studio free tier (no cost logging needed)
- Record: `{ timestamp, ticket: 870, task: "hygiene_scan", documents_scanned, duplicates_found, stale_count, orphans_found }`

---

### #871: Multi-Repo Write-Path Safety + Locking + Provenance

**Primary tasks**:
1. Optimistic locking (version checks)
2. Conflict detection (concurrent writes)
3. Write provenance logging (team, agent, timestamp)
4. Stress testing (concurrent agents)

**Resource assignment**:

| Task | Primary | Secondary | Fallback | Estimate |
|---|---|---|---|---|
| Locking logic implementation | Copilot (orchestration) | — | — | 2h (sync protocol design) |
| Provenance logging | Copilot (local I/O) | — | — | 0.5h (audit trail) |
| Conflict resolution strategy | Copilot (decision tree) | — | — | 1h (policy design) |
| Stress testing (concurrent writes) | OpenClaw (Tailscale) | — | — | 2h (multi-agent simulation) |

**Implementation pattern**:

```javascript
// scripts/wiki-write-safety.js

class WikiWriteCoordinator {
  async write(doc, update, context) {
    // context = { writer_id, team, timestamp }
    
    // Step 1: Check version (optimistic locking)
    const current = await wiki.get(doc.id);
    if (current.version !== doc.version) {
      throw new ConflictError(`Version mismatch: expected ${doc.version}, got ${current.version}`);
    }
    
    // Step 2: Apply update
    const updated = { ...current, ...update, version: current.version + 1 };
    
    // Step 3: Log provenance
    const audit = {
      doc_id: doc.id,
      writer_id: context.writer_id,
      team: context.team,
      timestamp: context.timestamp,
      version_old: current.version,
      version_new: updated.version,
      changes: diff(current, updated),
    };
    await auditLog.append(audit);
    
    // Step 4: Commit
    await wiki.set(doc.id, updated);
    return updated;
  }
}

// Stress testing via OpenClaw
// 50 concurrent agents attempt writes to same doc
const stressTest = async () => {
  const agents = Array(50).fill().map((_, i) => `agent-${i}`);
  const results = await Promise.all(
    agents.map(id => coordinator.write(doc, { content: `edit-${id}` }, { writer_id: id, team: "test" }))
  );
  // Expected: 50 writes serialized by version increments; no data loss
  console.log(`Stress test: ${results.filter(r => r.success).length}/50 successful writes`);
};
```

**Token tracking**: 
- Local logic, minimal cloud API usage
- Record: `{ timestamp, ticket: 871, task: "write_safety", stress_test_concurrent_agents: 50, success_rate: 100 }`

---

### #872: Retrieval Eval Harness + Quality Gates + Observability

**Primary tasks**:
1. Build ground-truth eval dataset (queries + expected evidence)
2. Implement retrieval metrics (Recall@K, MRR, NDCG, grounded-answer pass)
3. Define quality gates (threshold pass/fail)
4. Log observability metrics

**Resource assignment**:

| Task | Primary | Secondary | Fallback | Estimate |
|---|---|---|---|---|
| Eval dataset generation | Claude Code team (GPT) | Copilot | — | 2h (manual + synthetic) |
| Retrieval metric computation | Copilot (local logic) | — | — | 0.5h (math) |
| Baseline comparison (existing retrieval) | OpenRouter | Groq | Cerebras | 1h (benchmark run) |
| Quality gate CI/CD integration | Copilot (GitHub Actions) | — | — | 1h (CI config) |

**Implementation pattern**:

```javascript
// tests/wiki-retrieval-eval.test.js

const evalDataset = [
  {
    query: "What is the transformer architecture?",
    expected_chunks: ["wiki/transformers#section-2", "wiki/attention#mechanism"],
    grounding_required: true,
  },
  {
    query: "How do attention heads work?",
    expected_chunks: ["wiki/attention#heads"],
    grounding_required: true,
  },
  // ... 100+ ground-truth examples
];

describe("Wiki Retrieval Eval", () => {
  it("should achieve recall@5 >= 0.75", async () => {
    let correct = 0, total = 0;
    for (const {query, expected_chunks} of evalDataset) {
      const results = await wiki.retrieve(query, { top_k: 5 });
      const retrieved_chunk_ids = results.map(r => r.chunk_id);
      
      // Compute recall@5
      const matched = expected_chunks.filter(ec => retrieved_chunk_ids.includes(ec));
      if (matched.length > 0) correct++;
      total++;
    }
    
    const recall = correct / total;
    console.log(`Recall@5: ${(recall * 100).toFixed(1)}%`);
    expect(recall).toBeGreaterThanOrEqual(0.75); // QUALITY GATE
  });

  it("should achieve MRR >= 0.6 (mean reciprocal rank)", async () => {
    let mrr_sum = 0;
    for (const {query, expected_chunks} of evalDataset) {
      const results = await wiki.retrieve(query, { top_k: 10 });
      const rank = results.findIndex(r => expected_chunks.includes(r.chunk_id)) + 1;
      if (rank > 0) mrr_sum += 1 / rank;
    }
    
    const mrr = mrr_sum / evalDataset.length;
    console.log(`MRR: ${mrr.toFixed(3)}`);
    expect(mrr).toBeGreaterThanOrEqual(0.6); // QUALITY GATE
  });

  it("should have grounded-answer pass rate >= 0.85", async () => {
    // Synthesis check: LLM answer grounded in retrieved chunks?
    let grounded_count = 0;
    for (const {query, expected_chunks} of evalDataset) {
      const results = await wiki.retrieve(query, { top_k: 5 });
      const answer = await llm.synthesize(query, results);
      const isGrounded = answer.citations.some(c => expected_chunks.includes(c.chunk_id));
      if (isGrounded) grounded_count++;
    }
    
    const passRate = grounded_count / evalDataset.length;
    console.log(`Grounded-answer pass rate: ${(passRate * 100).toFixed(1)}%`);
    expect(passRate).toBeGreaterThanOrEqual(0.85); // QUALITY GATE
  });
});

// Baseline: measure current retrieval performance (before optimization)
// Run with Groq to compare against new implementation
const baselineResults = await benchmarkRetrieval({
  implementation: "current",
  dataset: evalDataset,
  model: "openrouter/groq/llama-2-70b",
});
```

**Token tracking**: 
- Record per eval run: `{ timestamp, ticket: 872, task: "eval_run", recall_at_5, mrr, grounded_pass_rate, baseline_comparison }`

---

## Global Tracking & Alerts

### Log Location: `logs/wiki-optimization-resource-usage.jsonl`

Each fleet resource usage is logged as a newline-delimited JSON object:

```json
{"timestamp":"2026-05-04T10:30:00Z","ticket":868,"task":"reranking","tokens_used":52400,"model":"groq/bge-reranker-v2-m3","cost_usd":0.31}
{"timestamp":"2026-05-04T10:45:00Z","ticket":869,"task":"embedding","docs_processed":1200,"vectors_generated":12000,"server":"36gbwinresource","cost_usd":0.00}
{"timestamp":"2026-05-04T11:00:00Z","ticket":870,"task":"hygiene_scan","documents_scanned":5000,"duplicates_found":127,"stale_count":340,"orphans_found":89,"cost_usd":0.00}
{"timestamp":"2026-05-04T12:00:00Z","ticket":872,"task":"eval_run","recall_at_5":0.78,"mrr":0.62,"grounded_pass_rate":0.87,"cost_usd":1.20}
```

### Budget Tracking Script

```bash
# scripts/global/wiki-opt-budget-check.sh
jq '.ticket' logs/wiki-optimization-resource-usage.jsonl | \
  jq -rs 'group_by(.) | map({ticket: .[0], count: length}) | sort_by(.count) | reverse' | \
  jq '.[] | "\(.ticket): \(.count) tasks"'

jq '.cost_usd' logs/wiki-optimization-resource-usage.jsonl | \
  paste -sd+ | bc | xargs echo "Total cost: $"
```

### Budget Ceiling

- Copilot sprint allocation: **50 USD** (for OpenRouter/Groq/Cerebras)
- Tailscale resources (36gbwinresource, OpenClaw): Amortized (no per-sprint cost)
- Google AI Studio: Free tier (alert if approaching limits)
- **Alert threshold**: 40 USD (80% of budget) → notify team lead

---

## Fallback Strategy

If primary resource unavailable:

1. **Groq rate-limited** → Switch to Cerebras (similar pricing, different rate limits)
2. **36gbwinresource unavailable** → Use Groq for embedding (slower but functional)
3. **Both cloud APIs unavailable** → Defer non-critical evals (#870, #872) to next sprint; prioritize #868–#869 (critical path)

---

## Success Criteria

- ✅ All fleet resources provisioned and tested (day 1)
- ✅ Token tracking logs consistent (no missing entries)
- ✅ Budget remains under 50 USD throughout sprint
- ✅ Resource routing transparent (each team knows which API their task uses)
- ✅ Fallback protocols tested (at least one failover per resource)

---

**Team&Model**: GitHub Copilot + Claude Haiku 4.5  
**Date**: 2026-05-04  
**Owner**: Copilot Team (implementation lead)  
**Reviewers**: Claude Code Team (compute validation), Manager (budget oversight)
