# Phase-D Wave 1: Codex Team Peer Review for #1148

## Scope

1. Ticket: #1148; parent Epic: #1130.
2. Team: cx; substrate: codex-cli; alias: Nova Harper.
3. Inputs read for this wave: `cc-rd.md`, `cp-rd.md`, `cx-rd.md`,
   v2 protocol section 5 and section 7 via git object lookup.
4. `git pull --ff-only` was attempted but blocked locally by read-only
   `.git/FETCH_HEAD`; review uses the checked-out branch state.

## Top 3 Agreements

1. Agreement: enforcement must move beyond advisory policy.
   CC section `Q5 - Lint patterns` proposes bypass lint; CP `F1` says policy
   cannot reach universal coverage alone. Evidence: direct provider paths remain
   visible in `free-router` and Ollama scripts.
   - repo: scripts/global/free-router.js#L41-L60
   - repo: scripts/global/ollama-direct.js#L21-L30

2. Agreement: keep HAMR as the instrumentation/governance boundary while
   preserving provider-specific normalization. CP `F4` and CC `Q4` both keep
   existing primitives; CX agrees because the adapter file already centralizes
   provider usage mapping.
   - repo: scripts/global/token-provider-adapters.js#L12-L21
   - repo: scripts/global/token-provider-adapters.js#L78-L94

3. Agreement: freshness needs explicit SLO evidence, not just scheduled jobs.
   CC `Q10` and CP `F3` converge on dual producers plus visible staleness.
   CX agrees, with the added requirement that coverage audit output should
   consume the SLO result instead of leaving it dashboard-only.
   - repo: scripts/global/governance-audit.js#L58-L70
   - repo: config/litellm-config.yaml#L101-L115

## Top 3 Disagreements

1. Disagreement: CC's Cloudflare Workers AI answer is too LiteLLM-first.
   LiteLLM is useful as a gateway, but Workers AI has a direct REST execution
   path and its own neuron/free-allocation economics; universal HAMR coverage
   should model direct Workers AI and LiteLLM-mediated Workers AI separately.
   - websearch: https://developers.cloudflare.com/workers-ai/get-started/rest-api/ (accessed 2026-05-09T06:33:01Z) -- Workers AI supports direct account `/ai/run/{model}` REST calls.
   - websearch: https://developers.cloudflare.com/workers-ai/platform/pricing/ (accessed 2026-05-09T06:33:01Z) -- Workers AI bills by neurons with a daily free allocation and model-specific token equivalents.
   - repo: config/litellm-config.yaml#L64-L78

2. Disagreement: CP's rollout adds `azure-openai` and `google-ai-studio` adapter
   tasks before proving current hot-path coverage. I would invert that order:
   ship read-only coverage audit first, because current repo call sites already
   bypass HAMR on Groq and Ollama paths.
   - websearch: https://docs.litellm.ai/ (accessed 2026-05-09T06:33:01Z) -- LiteLLM already documents Azure, Ollama, OpenRouter, Vertex/Gemini-style routing through one interface.
   - repo: scripts/global/free-router.js#L48-L60
   - repo: scripts/global/fleet-rollout-runner.js#L11-L15

3. Disagreement: both peer artifacts underweight schema stability risk if
   OpenTelemetry GenAI names become canonical too early. OTel GenAI is valuable
   as an export map, but current docs still mark the conventions Development
   and require opt-in behavior for latest experimental names.
   - websearch: https://opentelemetry.io/docs/specs/semconv/gen-ai/ (accessed 2026-05-09T06:33:01Z) -- GenAI semantic conventions are still Development with a stability opt-in transition.
   - websearch: https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-metrics/ (accessed 2026-05-09T06:33:01Z) -- GenAI metric names and attributes are also Development.
   - repo: scripts/global/token-provider-adapters.js#L8-L10

## Top 3 Challenges

1. Challenge to CC `Source inventory`: "no fleet/Ollama adapter" is too broad.
   The repo has an Ollama token adapter; the actual gap is that direct fleet
   and Ollama call sites do not route through a HAMR call-site shim.
   - websearch: https://docs.litellm.ai/ (accessed 2026-05-09T06:33:01Z) -- Ollama can also be called through LiteLLM, so adapter language must distinguish telemetry parser, gateway route, and call-site wrapper.
   - repo: scripts/global/token-provider-adapters.js#L57-L63
   - repo: scripts/global/fleet-rollout-runner.js#L32-L41

2. Challenge to CP `F7`: "OpenAI-compatible providers are not identical" is
   correct, but the proposed remedy should be capability metadata in the
   coverage audit before more named shims. Groq explicitly rejects some OpenAI
   fields, so the audit should find unsupported-parameter risk at call sites.
   - websearch: https://console.groq.com/docs/openai (accessed 2026-05-09T06:33:01Z) -- Groq is mostly OpenAI-compatible but documents unsupported features/fields.
   - repo: scripts/global/free-router.js#L51-L55
   - repo: scripts/global/token-provider-adapters.js#L90-L94

3. Challenge to CC `Q11`: a 4-widget dashboard panel is premature without a
   coverage-grade event contract. Cloudflare AI Gateway cache status is useful,
   but exact-match cache behavior and volatile caching make it a weak primary
   metric unless HAMR distinguishes provider-native cache from gateway cache.
   - websearch: https://developers.cloudflare.com/ai-gateway/features/caching/ (accessed 2026-05-09T06:33:01Z) -- AI Gateway caches identical requests, exposes HIT/MISS, supports TTL/custom keys, and notes volatile timing behavior.
   - repo: scripts/global/ollama-direct.js#L37-L42
   - repo: scripts/global/governance-audit.js#L63-L70

## New Questions

1. What is the minimum evidence record for a governed call that cannot expose
   exact request usage: route-only, aggregate reconciliation, or both?
2. Should Phase-C child tickets require `hamr:coverage` before any adapter
   expansion tickets, so migration scope is anchored in measured bypasses?
3. Should Cloudflare Workers AI direct REST and Cloudflare AI Gateway be modeled
   as separate provider substrates in HAMR telemetry?

PROPOSE_DECISION: title="Adopt read-only HAMR coverage audit as first implementation child"

PROPOSE_DECISION: title="Treat OpenTelemetry GenAI as export mapping, not internal canonical schema"

PROPOSE_DECISION: title="Model direct Workers AI and gateway-mediated Workers AI separately"

```yaml
---
phase: D
wave: 1
team: cx
agreements:
  - point: "HAMR needs enforceable bypass detection beyond advisory policy."
    cite_team: cc
    cite_artifact: rd
    evidence:
      - repo: scripts/global/free-router.js#L41-L60
  - point: "Provider normalization should preserve existing wrapper and adapter primitives."
    cite_team: cp
    cite_artifact: rd
    evidence:
      - repo: scripts/global/token-provider-adapters.js#L78-L94
  - point: "Freshness needs explicit SLO visibility."
    cite_team: cc
    cite_artifact: rd
    evidence:
      - repo: scripts/global/governance-audit.js#L58-L70
disagreements:
  - point: "LiteLLM should not be the first and only Workers AI path."
    cite_team: cc
    cite_artifact: rd
    rationale: "Direct Workers AI REST and neuron economics need separate telemetry."
    new_evidence:
      - websearch: https://developers.cloudflare.com/workers-ai/get-started/rest-api/ (accessed 2026-05-09T06:33:01Z)
      - repo: config/litellm-config.yaml#L64-L78
  - point: "Adapter expansion should not precede coverage census."
    cite_team: cp
    cite_artifact: rd
    rationale: "Known bypasses are already visible and should drive ticket order."
    new_evidence:
      - websearch: https://docs.litellm.ai/ (accessed 2026-05-09T06:33:01Z)
      - repo: scripts/global/free-router.js#L48-L60
  - point: "OpenTelemetry GenAI should not be internal canonical schema yet."
    cite_team: cp
    cite_artifact: rd
    rationale: "Development status makes it better as export mapping."
    new_evidence:
      - websearch: https://opentelemetry.io/docs/specs/semconv/gen-ai/ (accessed 2026-05-09T06:33:01Z)
      - repo: scripts/global/token-provider-adapters.js#L8-L10
challenges:
  - target_team: cc
    target_claim: "no fleet/Ollama adapter"
    challenge: "There is an Ollama telemetry adapter; the missing piece is wrapped fleet call-site routing."
    new_evidence:
      - websearch: https://docs.litellm.ai/ (accessed 2026-05-09T06:33:01Z)
      - repo: scripts/global/token-provider-adapters.js#L57-L63
  - target_team: cp
    target_claim: "Provider compatibility differences justify more named shims first."
    challenge: "Capability audit should precede shims because unsupported fields are call-site-specific."
    new_evidence:
      - websearch: https://console.groq.com/docs/openai (accessed 2026-05-09T06:33:01Z)
      - repo: scripts/global/free-router.js#L51-L55
  - target_team: cc
    target_claim: "A 4-widget dashboard panel is a Phase-1 output."
    challenge: "Dashboard metrics need a coverage-grade event contract before widget shape hardens."
    new_evidence:
      - websearch: https://developers.cloudflare.com/ai-gateway/features/caching/ (accessed 2026-05-09T06:33:01Z)
      - repo: scripts/global/governance-audit.js#L63-L70
new_questions:
  - "What is the minimum evidence record for governed calls without exact usage?"
  - "Should coverage audit precede adapter expansion in Phase-C child tickets?"
  - "Should direct Workers AI and AI Gateway be separate HAMR substrates?"
proposed_decisions:
  - title: "Adopt read-only HAMR coverage audit as first implementation child"
  - title: "Treat OpenTelemetry GenAI as export mapping, not internal canonical schema"
  - title: "Model direct Workers AI and gateway-mediated Workers AI separately"
Signed-by: Nova Harper
Team&Model: cx:gpt-5@codex-cli
Role: collaborator
last_activity_utc: 2026-05-09T06:33:01Z
---
```
