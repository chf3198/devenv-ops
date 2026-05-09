const { test, expect } = require('@playwright/test');
const path = require('path');

test('governance panel renders git state drift summary and violations', () => {
  const { renderGovernancePanel } = require(path.join(__dirname, '../dashboard/js/governance-panel'));
  const html = renderGovernancePanel({
    enabled: true,
    repoScope: { default_enabled: true },
    hooks: { PreToolUse: [], UserPromptSubmit: [], Stop: [] },
    audit: {
      git_state_drift: {
        status: 'FAIL',
        signals: {
          freshness: { status: 'stale' },
          worktree: { status: 'collision' },
          target: { status: 'compliant' },
        },
        violations: [{ signal: 'worktree', status: 'collision', guidance: 'Close redundant worktrees.' }],
      },
    },
  });
  expect(html).toContain('Git State Drift');
  expect(html).toContain('collision');
  expect(html).toContain('Drift Violations');
});