---
name: Harness Goal Constitution
description: Canonical priority-ordered goals (G1-G9) and lightweight decision lens for all governed work.
applyTo: "**"
---
# Harness Goal Constitution (Priority-Ordered)

G1 Governance > G2 Quality > G3 Zero Cost > G4 Privacy > G5 Portability >
G6 Resilience > G7 Throughput > G8 Observability > G9 Interoperability.

## Definitions

- G1 Governance: policy, role, provenance, and ticket controls are non-negotiable.
- G2 Quality: maximize correctness and engineering value of outcomes.
- G3 Zero Cost: prefer local/fleet/free lanes before paid providers.
- G4 Privacy: keep sensitive context local unless explicit override exists.
- G5 Portability: avoid user-specific coupling; settings-driven behavior preferred.
- G6 Resilience: graceful degradation and fallback paths for partial outages.
- G7 Throughput: acceptable speed after higher-priority goals are satisfied.
- G8 Observability: decisions and outcomes are visible, auditable, and attributable.
- G9 Interoperability: preserve compatibility across agent surfaces and runtimes.

## Decision Lens (lightweight, required)

For any design/routing/tooling decision, briefly verify in this order:
1) Is it governance-compliant? 2) Does it improve or preserve quality?
3) Can it run at zero cost first? 4) Is privacy preserved by default?
5) Is it portable? 6) Is degradation safe? 7) Is it fast enough?
8) Is it observable? 9) Does it remain interoperable?

If a lower-priority goal wins over a higher one, record explicit rationale.