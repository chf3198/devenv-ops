#!/usr/bin/env python3
"""UserPromptSubmit hook: inject lightweight G1-G9 decision lens context."""
import json
import re
import sys

GOALS = (
    "G1 Governance > G2 Quality > G3 Zero Cost > G4 Privacy > "
    "G5 Portability > G6 Resilience > G7 Throughput > "
    "G8 Observability > G9 Interoperability"
)

DECISION_RE = re.compile(
    r"\b(decide|decision|choose|tradeoff|priority|prioritize|rank|route|"
    r"policy|architecture|design|should we|which option|compare)\b",
    re.IGNORECASE,
)


def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except Exception:
        return 0

    prompt = str(payload.get("prompt", ""))
    if not prompt:
        return 0

    base = f"Goal lens: {GOALS}."
    if DECISION_RE.search(prompt):
        base += (
            " Decision check: justify any lower-priority override with explicit evidence."
        )

    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "UserPromptSubmit",
            "additionalContext": base,
        }
    }))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
