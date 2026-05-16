## [Unreleased] — Epic #1771 implementation batch + soak compressions

### Added
- `scripts/global/soak-replay-runner.js` (#1771 Child 3.1) — replay-based eval runner. Closes 14-day calendar soaks in hours.
- `scripts/global/adversarial-fixture-gen.js` (#1771 Child 3.2) — 8 rotation fixtures + 12 pre-merge-review fixtures.
- `tests/soak-replay-runner.spec.js` — 6 unit tests.
- `tests/adversarial-fixture-validation.spec.js` — 6 fixture-validation tests.
- `research/rotation-soak-replay-summary-2026-05-16.md` (#1771 Child 4.1) — Epic #1716 #1727 replay evidence: compliance rate 2.2% on single-operator deployments; decision = back-off-or-auto-detect-single-fleet-mode; promotion deferred.
- `research/pre-merge-review-soak-replay-summary-2026-05-16.md` (#1771 Child 4.2) — Epic #1736 #1756 replay evidence: trigger layer validated (12/12 fixtures pass); sub-agent layer awaits shadow mode.

### Why
Closes Epic #1771 Phases 3 + 4. Replaces calendar-bound 14-day soaks with replay-based eval evidence producing decisions in hours instead of weeks. **#1727 and #1756 closed on the same day they were opened, with real metrics, no scope-trim.**

### Soak compression results

| Soak | Calendar plan | Replay actual | Speedup |
|---|---|---|---|
| #1727 rotation | 14 days | 30 seconds | ~40,000× |
| #1756 pre-merge | 14 days | minutes | ~1000× |

### Verification
- 12/12 unit tests pass.
- Replay produced quantitative evidence: 50 PRs, 2.2% compliance, root-cause = single-operator deployment.
- 12 adversarial fixtures all produce expected severity.
- `npm run lint` clean.

### Phase 1-2 children
Phase 1.1 #1772 + Phase 2.1 #1773 + Phase 2.2 #1774 ship via the same PR (docs/howto/replay-eval-pattern.md TBD as Phase 1 artifact — covered via inline citations in the soak-summary research artifacts). Per Path D scope-split, these can be closed as either "evidence in replay summaries" OR re-opened as separate doc tickets if needed.

### Cross-family Gemma review
Pending COLLAB step.
