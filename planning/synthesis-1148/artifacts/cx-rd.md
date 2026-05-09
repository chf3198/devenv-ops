# Phase-R Independent R&D: Codex Team for #1148

Ticket: #1148
Parent Epic: #1130
Topic: Universal HAMR coverage strategy
Team: cx
Alias: Curtis Franks
Team&Model: codex:gpt-5@codex-cli
Authored UTC: 2026-05-09T06:17:17Z
Protocol: v2, per local kickoff and protocol marker

## Executive Summary

1. The repo already defines HAMR as the common cost and observability layer for
   Claude Code, Copilot, and Codex, but present enforcement is mostly advisory.
2. Universal coverage should be treated as a control-plane problem, not a
   one-off provider wrapper adoption campaign.
3. The minimum viable target is: every governed provider call has a runtime,
   provider, lane, activation state, and token/cache observation path, even when
   the underlying runtime cannot expose exact per-request usage.
4. Coverage must stay compatible with privacy and offline constraints: absence
   of HAMR should block only governed provider calls, not local repo work.
5. The likely winning architecture is a three-layer model:
   activation contract, runtime adapter contract, and evidence gate contract.
6. The activation contract proves each checkout/runtime has HAMR markers,
   current scripts, and a non-disabled state.
7. The runtime adapter contract gives each team a small local shim surface for
   provider calls, telemetry normalization, and opt-out semantics.
8. The evidence gate contract is what makes "universal" auditable: tests,
   sync verification, and drift reports must fail or warn on uncovered paths.
9. Current repo assets already cover much of this; #1148 should focus on closing
   the gaps between policy, runtime deployment, and enforceable evidence.

## Contamination Declaration

10. I did not read `planning/synthesis-1148/artifacts/cc-rd.md`.
11. I did not read `planning/synthesis-1148/artifacts/cp-rd.md`.
12. I did read `AGENTS.md` supplied in the prompt.
13. I did read `.github/copilot-instructions.md`.
14. I did read `planning/synthesis-1148/KICKOFF.md`.
15. I did read `planning/synthesis-1148/protocol-version.md`.
16. I attempted to read `research/cross-team-rd-protocol-v2-2026-05-09.md`.
17. That file was absent in this checkout at the requested path.
18. I searched local non-artifact files for the protocol and ticket context.
19. I did not open sibling team Phase-R artifacts or generated replacements.
20. I attempted `gh issue view 1130` and `gh issue view 1148`.
21. Both failed locally with `error connecting to api.github.com`.
22. I attempted browser access to the public GitHub/API issue URLs.
23. The issue bodies were not accessible through the browser tool.
24. I therefore used the local kickoff metadata, repo evidence, and public docs.
25. Constraint impact: issue-body-specific research questions may be missing.

## Protocol Evidence Read

26. The kickoff identifies synthesis directory, branch, Epic #1130, and R&D
   ticket #1148.
27. repo: planning/synthesis-1148/KICKOFF.md#L5-L12
28. The kickoff states the topic is universal HAMR coverage and forbids seeded
   research from cancelled #1131.
29. repo: planning/synthesis-1148/KICKOFF.md#L22-L24
30. The kickoff defines Phase-R as independent first-pass with mandatory
   websearch and repo evidence.
31. repo: planning/synthesis-1148/KICKOFF.md#L26-L30
32. The protocol marker points to the missing v2 protocol file path.
33. repo: planning/synthesis-1148/protocol-version.md#L1-L1

## Research Questions Reconstructed

34. How can HAMR coverage become universal across Claude Code, Copilot, and Codex?
35. Which provider-call paths need wrapping, telemetry, or explicit opt-out?
36. What evidence proves a runtime is HAMR-active before governed calls?
37. How should token and cache telemetry be normalized across providers?
38. How can HAMR remain portable and privacy-preserving across local/fleet/cloud?
39. How should zero-cost routing and HAMR mechanics stay separated?
40. How should the repo prevent future drift after initial rollout?

## Current Repo State

41. HAMR is already defined as a cross-team layer for cost and observability.
42. repo: instructions/hamr-routing.instructions.md#L7-L15
43. The provider contract says governed calls should flow through the wrapper.
44. repo: instructions/hamr-routing.instructions.md#L29-L39
45. The instructions correctly separate runtime identity from provider path.
46. repo: instructions/hamr-routing.instructions.md#L40-L50
47. HAMR also owns MCP capability dispatch and signed bundle verification.
48. repo: instructions/hamr-routing.instructions.md#L52-L56
49. The explicit cost levers are caching, spillover, sticky routes, and batching.
50. repo: instructions/hamr-routing.instructions.md#L58-L63
51. The boundary rule is strong: HAMR scripts live in `scripts/global/` only.
52. repo: instructions/hamr-routing.instructions.md#L65-L69
53. Activation gates already name `hamr:activate`, `hamr:sync-verify`, and the
   Playwright smoke test.
54. repo: instructions/hamr-routing.instructions.md#L71-L84
55. The global task router chooses lanes and delegates provider mechanics to HAMR.
56. repo: instructions/global-task-router.instructions.md#L11-L21
57. The router repeats that HAMR owns caching, spillover, sticky-route, batching,
   quota, and MCP doctor mechanics.
58. repo: instructions/global-task-router.instructions.md#L48-L50
59. The activation script installs hooks, periodic push, checks key material, and
   writes per-team markers.
60. repo: scripts/global/hamr-activate.sh#L12-L31
61. Activation currently supports Claude Code, Copilot, and Codex marker paths.
62. repo: scripts/global/hamr-activate.sh#L41-L58
63. Sync verification checks script presence in Copilot and Codex runtime targets.
64. repo: scripts/global/hamr-sync-verify.js#L1-L22
65. Its script inventory is concrete but likely incomplete as HAMR grows.
66. repo: scripts/global/hamr-sync-verify.js#L10-L17
67. The session hook checks for missing, disabled, malformed, or stale HAMR config.
68. repo: hooks/scripts/hamr_activation_check.py#L14-L27
69. The same hook emits advisory context rather than hard blocking.
70. repo: hooks/scripts/hamr_activation_check.py#L50-L62
71. Global standards invoke the HAMR activation hook at session start.
72. repo: hooks/global-standards.json#L14-L25
73. The wrapper reads team markers across Claude, Copilot, and Codex paths.
74. repo: scripts/global/hamr-provider-wrapper.js#L16-L31
75. Wrapper disable semantics honor `MEGINGJORD_HAMR_DISABLED=1`.
76. repo: scripts/global/hamr-provider-wrapper.js#L33-L41
77. The wrapper normalizes provider telemetry through provider adapters.
78. repo: scripts/global/hamr-provider-wrapper.js#L43-L55
79. The wrapper applies sticky route, cache headers, stats emission, and spillover.
80. repo: scripts/global/hamr-provider-wrapper.js#L58-L80
81. Capability probing already checks six provider metadata endpoints read-only.
82. repo: scripts/global/capability-probe.js#L16-L23
83. Capability probing is designed to avoid inference charges.
84. repo: scripts/global/capability-probe.js#L35-L41
85. Capability manifests include providers, fleet, Cloudflare, R2, OIDC, MCP, and
   npm trusted publishing substrate status.
86. repo: scripts/global/capability-probe.js#L67-L90
87. Package scripts expose HAMR activation, cache, health, policy, sync, routing,
   and telemetry commands.
88. repo: package.json#L38-L58
89. The repo also exposes routing and telemetry reporting commands.
90. repo: package.json#L78-L89
91. Cross-team HAMR tests verify Worker health, quota schema, MCP auth, signing,
   wrapper shape, sync verification, local cache path, and disable behavior.
92. repo: tests/hamr-team-integration.spec.js#L14-L33
93. repo: tests/hamr-team-integration.spec.js#L35-L72
94. repo: tests/hamr-team-integration.spec.js#L74-L90
95. The IDE proxy is opt-in and routes sub-premium Claude Code turns through
   fleet/free providers while preserving premium passthrough.
96. repo: instructions/ide-proxy.instructions.md#L7-L23
97. The proxy has explicit opt-out through the same HAMR disable variable.
98. repo: instructions/ide-proxy.instructions.md#L25-L38

## Web Research Citations

99. websearch: https://platform.openai.com/docs/guides/prompt-caching (accessed 2026-05-09T06:17:17Z) — OpenAI prompt caching is automatic for sufficiently long prompts, exposes `cached_tokens`, supports cache keys, and can reduce latency and input costs when static prefixes are stable.
100. websearch: https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching (accessed 2026-05-09T06:17:17Z) — Anthropic caching uses `cache_control`, returns cache creation/read token fields, and depends on stable prompt prefix ordering across tools, system, and messages.
101. websearch: https://docs.anthropic.com/en/api/creating-message-batches (accessed 2026-05-09T06:17:17Z) — Anthropic Message Batches support async grouped message calls, up to large request counts and batch sizes, making HAMR batch routing suitable for time-elastic work.
102. websearch: https://developers.cloudflare.com/ai-gateway/features/caching/ (accessed 2026-05-09T06:17:17Z) — Cloudflare AI Gateway can cache identical provider requests, supports per-request cache TTL and custom cache keys, and emits cache hit/miss headers.
103. websearch: https://developers.cloudflare.com/ai-gateway/configuration/rate-limiting/ (accessed 2026-05-09T06:17:17Z) — AI Gateway rate limiting can cap requests with fixed or sliding windows and returns 429 when limits are exceeded.
104. websearch: https://docs.github.com/en/actions/concepts/security/openid-connect (accessed 2026-05-09T06:17:17Z) — GitHub Actions OIDC supports short-lived cloud tokens, reducing reliance on long-lived deployment secrets.
105. websearch: https://developers.cloudflare.com/durable-objects/api/alarms/ (accessed 2026-05-09T06:17:17Z) — Durable Object alarms provide future wakeup, retry, and queue-like scheduling primitives useful for HAMR periodic or delayed reconciliation.
106. websearch: https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-metrics/ (accessed 2026-05-09T06:17:17Z) — OpenTelemetry GenAI metrics define token usage histograms and require provider, operation, token type, and model attributes where available.

## Findings

107. The repo already has the right conceptual split: lane policy is not HAMR.
108. Universal coverage should preserve that split because it prevents runtime
    teams from baking provider-specific cost mechanics into routing policy.
109. The strongest existing asset is `hamr-provider-wrapper.js`; its limitation
    is that it is opt-in at call sites and cannot guarantee coverage by itself.
110. The strongest existing control is activation marking; its limitation is that
    the hook is advisory and cannot prove every governed provider call used HAMR.
111. The strongest existing validation is `tests/hamr-team-integration.spec.js`;
    its limitation is that it tests shape and reachability, not call-site census.
112. The strongest existing drift defense is `hamr:sync-verify`; its limitation
    is a hand-maintained script list and no Claude target in the verifier.
113. Provider telemetry cannot be perfectly uniform: OpenAI exposes cached token
    fields differently from Anthropic, and runtime shells may hide request usage.
114. The policy already anticipates this by forbidding invented Codex token totals.
115. Coverage must therefore distinguish exact usage, inferred aggregate usage,
    and route-only metadata.
116. Cloudflare AI Gateway can be useful as an external cache/observability layer,
    but exact full-body cache keys may conflict with privacy and dynamic prompts.
117. Provider-native prompt caching is still needed because it can reuse prefixes
    even when entire request bodies differ.
118. Batch routing is suitable for non-urgent R&D, drift reports, audits, and
    synthesis jobs, but should not be universal for interactive agent turns.
119. OIDC should be preferred for CI-to-cloud HAMR publish/deploy flows where
    Cloudflare support exists, but local operator workflows still need key files.
120. Durable Object alarms are a good conceptual fit for per-team deferred push,
    quota refresh, and mailbox retry because they support scheduled retry logic.
121. OpenTelemetry GenAI conventions give a portable target vocabulary, but they
    are still development-stage and should be used as an export mapping, not as
    the internal canonical schema.

## Proposed Universal Coverage Model

122. Layer 1: Activation contract.
123. Each runtime must be able to answer: enabled, activated_at, activated_by,
    runtime path, axis consumers, wrapper version, and script bundle hash.
124. Layer 2: Runtime adapter contract.
125. Each runtime must expose or emulate: provider, lane, model, request class,
    usage fields if available, cache fields if available, and disabled reason.
126. Layer 3: Evidence gate contract.
127. Each repo or runtime must produce: sync verification, wrapper smoke test,
    activation freshness, call-site census, and telemetry schema check.
128. Layer 4: Drift remediation.
129. If any gate finds missing scripts, stale activation, or unknown provider path,
    the remediation should be a command the agent can run, not manual prose.

## Coverage Matrix

130. Claude Code: existing marker path and IDE proxy docs exist; high risk is
    direct vendor traffic that cannot be wrapped unless proxy is activated.
131. Copilot: existing marker path and script target exist; high risk is dashboard
    and extension-internal traffic that may only be observable through aggregate
    reports or local shims.
132. Codex: existing marker path and script target exist; high risk is request
    usage opacity, already recognized in token telemetry policy.
133. Local fleet/Ollama: should be covered as provider path, even when token cost
    is zero, because observability and lane correctness still matter.
134. OpenRouter/free providers: should be covered by capability probe and wrapper
    adapters; rate-limit spillover needs provider-state evidence.
135. OpenAI-compatible endpoints: should use `provider=openai-compatible` unless
    the actual provider is known.
136. Anthropic direct API: best target for cache control and batch routing, but
    must record cache write/read fields separately.
137. Cloudflare AI Gateway: useful for request cache and rate limit policy, but
    should remain a substrate, not the only HAMR enforcement point.

## Gaps To Close

138. Add a call-site census tool that scans scripts, hooks, dashboard, and agents
    for known provider SDKs, API env vars, and raw provider URLs.
139. The census should classify each finding as wrapped, intentionally external,
    aggregate-only, or uncovered.
140. Add Claude target support to `hamr-sync-verify.js`, or explain why Claude is
    covered through a different deploy mechanism.
141. Replace the static `HAMR_SCRIPTS` inventory with a manifest generated from
    a repo-local HAMR bundle definition.
142. Add a wrapper version or bundle SHA to `hamr-config.json` so activation
    freshness includes code freshness, not only timestamp freshness.
143. Make session-start advisory sufficient for offline work but add a pre-provider
    hard gate for governed provider calls where the runtime allows it.
144. Add a telemetry schema test that validates provider, runtime, lane, model,
    cache fields, and usage confidence level.
145. Add `usage_confidence` values: `exact`, `aggregate`, `route-only`, `unknown`.
146. Add explicit `hamr_disabled_reason` values so opt-outs are auditable.
147. Add a periodic report that compares capability probe providers against
    observed providers and flags active-but-unwrapped providers.
148. Add docs for how Codex sessions report route metadata when exact token totals
    are unavailable.

## Recommended Design

149. Create `scripts/global/hamr-coverage-audit.js`.
150. Inputs: repo files, package scripts, runtime target dirs, capability manifest,
    and optional telemetry JSONL.
151. Outputs: machine JSON plus markdown summary.
152. Required categories: activation, sync, call-sites, telemetry, opt-outs.
153. Add `npm run hamr:coverage` and a Playwright or Node test fixture.
154. Update `hamr-sync-verify.js` to read HAMR script names from a generated
    bundle manifest rather than a static array.
155. Extend activation marker to include `bundle_sha`, `wrapper_version`, and
    `coverage_schema_version`.
156. Add a small provider-call helper contract doc with examples for direct SDK,
    OpenAI-compatible SDK, local Ollama, and aggregate-only runtime traffic.
157. Require every new provider adapter to include telemetry fixtures for usage
    and cache fields.
158. Keep `MEGINGJORD_HAMR_DISABLED=1`, but require an evidence line whenever
    governed work runs with it set.

## Policy Recommendations

159. "Universal" should mean all governed provider calls are covered or explicitly
    exempted with reason, not that every byte always traverses the Worker.
160. Runtime-private traffic can satisfy HAMR through route metadata plus aggregate
    reconciliation if direct wrapping is impossible.
161. Exact token reporting should be preferred but not fabricated.
162. Cache metrics should distinguish provider-native cache from AI Gateway cache.
163. Prompt cache hit-rate should be a cost signal; it should not be used as the
    sole quality or correctness gate.
164. Provider cache keys must avoid embedding sensitive prompt text in operator
    logs or custom metadata.
165. Batch routing should be opt-in by task class and latency tolerance.
166. OIDC and short-lived credentials should be preferred for CI deploy/push.
167. Local key material remains acceptable for operator-local signed telemetry
    where no CI trust relationship exists.
168. Offline and air-gapped repos must have explicit disabled state, not silent
    partial failure.

## Acceptance Criteria For #1148

169. A fresh checkout can run `npm run hamr:activate`.
170. A fresh checkout can run `npm run hamr:sync-verify`.
171. A fresh checkout can run `npm run hamr:coverage`.
172. Coverage output identifies all three runtime marker paths.
173. Coverage output identifies every HAMR script required by the bundle.
174. Coverage output flags raw provider URLs or API env vars not behind approved
    wrappers or documented aggregate-only paths.
175. Tests cover enabled, disabled, stale, and missing activation states.
176. Tests cover at least Anthropic, OpenAI-compatible, OpenRouter, and Ollama
    provider classifications.
177. Telemetry fixtures cover exact usage, cache usage, aggregate-only, and
    route-only records.
178. Documentation states when provider-native caching, Cloudflare AI Gateway
    caching, sticky routing, spillover, and batch routing apply.
179. Docs explicitly say the router selects lane while HAMR supplies mechanics.
180. The final implementation preserves the current opt-out variable.

## Risks

181. Hard provider gates can block useful local work if implemented too broadly.
182. Runtime-private model calls may never expose exact request usage.
183. A static wrapper-only strategy misses CLI, extension, and proxy traffic.
184. A gateway-only strategy misses provider-native prompt cache savings.
185. Over-broad telemetry can leak prompts, keys, or repo-sensitive metadata.
186. Script-list drift can produce false confidence.
187. Provider docs and model APIs change quickly; adapters need fixture tests.
188. A single "covered yes/no" label hides important confidence differences.

## De-risking Plan

189. First implement read-only coverage audit before adding hard gates.
190. Use warnings for one cycle, then block only governed provider calls with
    clear remediation.
191. Store route metadata locally with minimal fields and no prompt bodies.
192. Keep provider token adapters small and fixture-driven.
193. Reconcile local telemetry with aggregate usage where available.
194. Version the HAMR coverage schema and activation marker.
195. Add a docs-drift check whenever HAMR scripts or provider adapters change.

## Phase-D Positions To Debate

196. Should Claude Code be required to use the IDE proxy for universal coverage,
    or can aggregate telemetry satisfy coverage for vendor-private calls?
197. Should `hamr-sync-verify.js` verify Claude runtime targets directly, given
    current instructions say all three teams are first-class consumers?
198. Should coverage gating block at SessionStart, PreToolUse, or only at
    provider wrapper invocation?
199. What is the minimum acceptable telemetry for Codex when exact per-request
    token usage is unavailable?
200. Should Cloudflare AI Gateway be a required substrate or optional enhancer?
201. Should OpenTelemetry GenAI names become the internal schema or an export map?
202. How should disabled/air-gapped mode be represented in issue closeout evidence?

## Sign-Off

203. Phase-R role: independent R&D.
204. Author: Curtis Franks.
205. Team&Model: codex:gpt-5@codex-cli.
206. Independence: preserved; no sibling Phase-R artifacts read.
207. Web citations: 8.
208. Repo anchors: 31.
209. Blockers: protocol file and GitHub issue bodies were unavailable locally.
210. Recommendation: proceed to Phase-D with coverage audit plus marker/schema
    hardening as the Codex Team opening position.
