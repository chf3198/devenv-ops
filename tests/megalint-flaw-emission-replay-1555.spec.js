const { test, expect } = require('@playwright/test');
const rule = require('../scripts/global/megalint/flaw-emission');

test('#1555 AC5: replay of 2026-05-14 catches at least 3 uncited flaw mentions', () => {
  const comments = [
    { body: '## COLLABORATOR_HANDOFF\nI had to work around git rm --cached propagating data loss across sibling worktrees' },
    { body: '## COLLABORATOR_HANDOFF\nI had to rework PR title length after first push failed' },
    { body: '## ADMIN_HANDOFF\nFlaw observed: admin-merge bypass pressure while CI gates were failing' },
    { body: '## CONSULTANT_CLOSEOUT\nSide-effect of sibling-worktree node_modules workaround, artifact: #1554' },
  ];

  const result = rule.validate({ comments });

  expect(result.mentions).toBeGreaterThanOrEqual(4);
  expect(result.violations.length).toBeGreaterThanOrEqual(3);
  expect(result.ok).toBe(false);
});
