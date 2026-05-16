# Structured Finding Format (#1739)

Phase 1.3 research for Epic #1736. Compares SARIF, JSON Lines, and GitHub Review API for sub-agent finding emission.

## Three candidate formats

### Option A — SARIF (Static Analysis Results Interchange Format)

OASIS standard since 2020; ISO/IEC 2022. Native support in GitHub Code Scanning, GitLab SAST, Azure DevOps, IDE plugins (VS Code, JetBrains).

```json
{
  "version": "2.1.0",
  "runs": [{
    "tool": { "driver": { "name": "pre-merge-review", "version": "1.0.0" } },
    "results": [{
      "ruleId": "bug-detect/null-deref",
      "level": "error",
      "message": { "text": "Null dereference at L42" },
      "locations": [{ "physicalLocation": {
        "artifactLocation": { "uri": "src/foo.js" },
        "region": { "startLine": 42 }
      }}],
      "properties": { "confidence": 0.85, "sub_agent": "bug-detect" }
    }]
  }]
}
```

**Pros**: GitHub Code Scanning ingests SARIF directly → findings appear in PR Security tab natively. Industry standard; IDE support out of the box. Cross-runtime.
**Cons**: Verbose. Schema is rigid (custom severity tiers require workarounds via properties bag). 2.1.0 spec is dense.

### Option B — JSON Lines (custom lightweight)

One finding per line; trivial to grep/jq/append.

```jsonl
{"severity":"high","category":"security","sub_agent":"security","file":"src/auth.js","line":12,"message":"Hardcoded secret","confidence":0.92,"trigger":"path-glob:auth"}
{"severity":"medium","category":"bug","sub_agent":"bug-detect","file":"src/foo.js","line":42,"message":"Null deref","confidence":0.78}
```

**Pros**: Append-only; grep/jq friendly. Matches existing harness telemetry (`~/.megingjord/incidents.jsonl`, `cache-stats.jsonl`). Trivial to write/read in JS, TS, Python.
**Cons**: No native GitHub UI integration. No IDE plugin. Custom schema = ongoing maintenance.

### Option C — GitHub Review API

Native `gh api repos/X/pulls/Y/reviews` POST with `event: COMMENT/APPROVE/REQUEST_CHANGES` and inline comments per-file-per-line.

```bash
gh api -X POST /repos/$REPO/pulls/$PR/reviews \
  -F event=COMMENT \
  -F comments[][path]=src/auth.js -F comments[][line]=12 \
  -F comments[][body]="security: Hardcoded secret"
```

**Pros**: Native PR UX. Comments appear inline next to code. Built-in dispute mechanism (reply/resolve).
**Cons**: Per-finding API call (slower). No structured-output schema (just free text body). Can't query findings later (locked behind PR review).

## Recommendation

**Primary format: SARIF.** Secondary format: JSON Lines.

Rationale:

1. **SARIF unlocks GitHub Code Scanning UI** — findings appear in the Security tab of every PR + repo dashboard. This is the navigability win Codex Team flagged in their #1604 review of the prior Epic.
2. **Cross-runtime compatibility** — Codex / Copilot / Claude Code skills can all ingest SARIF without per-team adapters (composes with Epic #1604 cross-team contract).
3. **IDE integration** — VS Code SARIF Viewer + JetBrains plugins surface findings to developers without leaving the editor.
4. **JSON Lines fallback** for harness-internal telemetry (incidents.jsonl pattern) — sub-agents emit SARIF for GitHub; aggregator also writes JSONL to `~/.megingjord/pre-merge-review.jsonl` for local query.

**Rejection of Option C (GitHub Review API)**: locks findings behind PR UI; not queryable later; can't compose with cross-team analytics.

## Minimum field set (per AC3)

```typescript
interface Finding {
  severity: 'low' | 'medium' | 'high';
  category: 'bug' | 'security' | 'quality' | 'test-coverage' | 'architectural-drift';
  file: string;           // path relative to repo root
  line: number;
  message: string;        // 1-3 sentence finding
  suggestion?: string;    // optional fix proposal
  confidence: number;     // 0.0-1.0
  sub_agent: 'bug-detect' | 'security' | 'test-coverage' | 'architectural-drift';
  trigger?: string;       // auto-escalate trigger name if applied
}
```

SARIF mapping:
- `severity` → `level` (error/warning/note) + properties.severity
- `category` → `ruleId` prefix (e.g., `security/hardcoded-secret`)
- `confidence` + `sub_agent` + `trigger` → `properties` bag

## Compatibility with existing harness telemetry

- `~/.megingjord/incidents.jsonl` — anneal events; compatible with the JSONL fallback.
- `dashboard/events.jsonl` — baton events; could include `event: pre-merge-review-finding` per finding.
- `KV substrate-health` — HAMR can store per-PR finding aggregates.

Phase 3 implementation (#1752) emits BOTH SARIF (for GitHub upload) AND JSONL (for local telemetry). Aggregator handles the dual-emission.

## AC verification

- [x] AC1: Three formats compared.
- [x] AC2: Queryability, cross-runtime, IDE support documented.
- [x] AC3: Minimum field set specified (TS interface + SARIF mapping).
- [x] AC4: SARIF primary + JSONL secondary recommended.
- [x] AC5: Compatibility with existing harness telemetry (incidents.jsonl, dashboard events) confirmed.

## Sources

- [SARIF 2.1.0 Specification (OASIS)](https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html)
- [GitHub Code Scanning SARIF upload docs](https://docs.github.com/en/code-security/code-scanning/integrating-with-code-scanning/sarif-support-for-code-scanning)
- [Augment Code "AI Code Review CI/CD Pipeline"](https://www.augmentcode.com/guides/ai-code-review-ci-cd-pipeline)
- [Qodo "Single-Agent vs Multi-Agent Code Review 2026"](https://www.qodo.ai/blog/single-agent-vs-multi-agent-code-review/) — Qodo Merge emits structured findings; cited as multi-agent precedent.
