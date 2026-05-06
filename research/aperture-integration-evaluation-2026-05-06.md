---
title: Aperture Integration Evaluation (R&D-only)
date: 2026-05-06
epic: 949
ticket: 1044
authored-by: operator-deputy (Claude Code Team runtime)
status: COMPLETE — go/no-go documented; integration deferred
---

# Aperture Integration Evaluation

## Decision: DEFER

Aperture integration is **deferred** until both criteria met:

1. **Aperture exits beta** (currently beta as of 2026-05-06; alpha → beta announced 2026).
2. **Tailscale plan tier permits Aperture access** (verify operator's current plan; Aperture may require Business or Enterprise).

## Why defer

- HAMR substrate (Epic #860 closed) already provides centralized Cloudflare Worker for cross-team auth + signed observability. Adding Aperture now duplicates substrate without clear marginal value.
- LiteLLM (current routing engine) supports 100+ providers; Aperture supports ~4 (OpenAI, Anthropic, Google, ?). Migrating off LiteLLM = capability loss.
- Aperture's beta status means breaking changes likely; production adoption now incurs migration debt.

## What Aperture would add (when adopted)

- **Tailscale-native identity**: no API-key distribution to clients. Operator/team identity flows from tailnet membership.
- **`/v1/mcp` aggregator**: aggregates remote MCP servers (HAMR `/mcp` could be one) behind a single endpoint with identity-based access control.
- **Built-in dashboard**: per-team usage, latency, cost telemetry without writing custom dashboard work.
- **Model-based routing**: similar to LiteLLM but Tailscale-native.

## Re-evaluation triggers

- Tailscale announces Aperture GA → reopen this evaluation.
- Operator's Tailscale plan upgrades to Business/Enterprise → reopen.
- Quarterly cadence: re-check 2026-08-06 + 2026-11-06 regardless of trigger.

## Implementation hooks (when adopted)

If/when Aperture is adopted, integration would be:
- LiteLLM stays as the multi-provider router for non-Aperture-supported providers.
- Aperture handles Anthropic + OpenAI + Google traffic with Tailscale identity.
- HAMR `/mcp` is registered as a remote MCP server in Aperture's `/v1/mcp` aggregator.
- `wiki/concepts/aperture.md` gets a concept page describing the topology.

## Sources

- [Aperture by Tailscale docs](https://tailscale.com/docs/aperture)
- [Aperture MCP server proxying](https://tailscale.com/docs/aperture/mcp-server)
- [Aperture configuration](https://tailscale.com/docs/aperture/configuration)
