"""Tests for hooks/scripts/goal_tier_resolver.py (#1259 / Epic #1113 AC5)."""
import json
import sys
import tempfile
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
HOOKS_SCRIPTS = REPO_ROOT / "hooks" / "scripts"
sys.path.insert(0, str(HOOKS_SCRIPTS))

from goal_tier_resolver import (  # noqa: E402
    TIER_ORDER, context_for_tier, read_tier_from_state, resolve_tier,
)


class GoalTierResolverTests(unittest.TestCase):
    def _write_state(self, tier):
        tmpdir = Path(tempfile.mkdtemp())
        state_file = tmpdir / "goal-tier-state.json"
        state_file.write_text(json.dumps({"actuators": {"A1": {"tier": tier}}}))
        return state_file

    def test_read_tier_default_b_when_missing(self):
        missing = Path(tempfile.gettempdir()) / "nonexistent-ghs-state.json"
        if missing.exists():
            missing.unlink()
        self.assertEqual(read_tier_from_state(missing), "B")

    def test_read_tier_default_b_on_parse_error(self):
        tmpdir = Path(tempfile.mkdtemp())
        bad = tmpdir / "bad.json"
        bad.write_text("not-json")
        self.assertEqual(read_tier_from_state(bad), "B")

    def test_read_tier_round_trip_all_tiers(self):
        for tier in TIER_ORDER:
            state = self._write_state(tier)
            self.assertEqual(read_tier_from_state(state), tier,
                             f"round-trip failed for {tier}")

    def test_resolve_tier_uses_max_of_state_and_role(self):
        self.assertEqual(resolve_tier("B", "consultant"), "B+")
        self.assertEqual(resolve_tier("B++", "consultant"), "B++")
        self.assertEqual(resolve_tier("B+++", "manager"), "B+++")
        self.assertEqual(resolve_tier("B", "manager"), "B")

    def test_resolve_tier_handles_unknown_tier_as_b(self):
        self.assertEqual(resolve_tier("unknown", "consultant"), "B+")
        self.assertEqual(resolve_tier("", "manager"), "B")

    def test_context_for_tier_b_is_empty(self):
        self.assertEqual(context_for_tier("B"), "")

    def test_context_for_tier_b_plus_includes_definitions(self):
        ctx = context_for_tier("B+")
        self.assertIn("Goal definitions", ctx)
        self.assertIn("G1 Governance", ctx)

    def test_context_for_tier_b_plus_plus_includes_violations_note(self):
        ctx = context_for_tier("B++")
        self.assertIn("Goal definitions", ctx)
        self.assertIn("Tier B++", ctx)
        self.assertIn("violations elevated", ctx)

    def test_context_for_tier_b_plus_plus_plus_includes_role_reminders(self):
        ctx = context_for_tier("B+++")
        self.assertIn("Tier B+++", ctx)
        self.assertIn("per-role goal reminders", ctx)

    def test_context_for_tier_b_quad_plus_includes_consultant_force(self):
        ctx = context_for_tier("B++++")
        self.assertIn("Tier B++++", ctx)
        self.assertIn("consultant pre-action review FORCED", ctx)

    def test_tier_order_canonical(self):
        self.assertEqual(TIER_ORDER, ["B", "B+", "B++", "B+++", "B++++"])


if __name__ == "__main__":
    unittest.main()
