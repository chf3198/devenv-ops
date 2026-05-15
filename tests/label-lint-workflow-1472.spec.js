// Regression tests for #1472 changes to .github/workflows/label-lint.yml:
//   1. Diagnostic logging line added for every close-protection decision.
//   2. Phase 2 role-cleanup respects Rule E2 (Epic always carries role:manager).
// Golden-file style — verifies the YAML contains the specific guards.
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const WORKFLOW = fs.readFileSync(
  path.resolve(__dirname, '..', '.github', 'workflows', 'label-lint.yml'),
  'utf8',
);

test('#1472 AC1: workflow logs every close-protection decision with reason', () => {
  expect(WORKFLOW).toContain('close-protection decision=');
  expect(WORKFLOW).toContain('reason=${decision.reason}');
  expect(WORKFLOW).toContain('(#1472)');
});

test('#1472 AC2: Phase 2 role-cleanup respects Rule E2 — Epic always retains role:manager', () => {
  expect(WORKFLOW).toMatch(/const isEpic = labels\.includes\(['"]type:epic['"]\)/);
  expect(WORKFLOW).toMatch(/if \(isEpic && role === ['"]role:manager['"]\) continue/);
});

test('#1472 AC3: the diagnostic log appears BEFORE the auto-transition branch (so noop reasons are visible)', () => {
  const decisionLogIdx = WORKFLOW.indexOf('close-protection decision=');
  const autoTransitionIdx = WORKFLOW.indexOf("decision.action === 'auto-transition'");
  expect(decisionLogIdx).toBeGreaterThan(-1);
  expect(autoTransitionIdx).toBeGreaterThan(-1);
  expect(decisionLogIdx).toBeLessThan(autoTransitionIdx);
});

test('#1472 AC4: Epic-role-protection guard appears INSIDE the closed-state cleanup block', () => {
  // Validate that the guard is in the right scope, not outside the if (issue.state === 'closed')
  const closedBlockStart = WORKFLOW.indexOf("issue.state === 'closed' && closeRoles");
  const epicGuardIdx = WORKFLOW.indexOf("isEpic && role === 'role:manager'");
  expect(closedBlockStart).toBeGreaterThan(-1);
  expect(epicGuardIdx).toBeGreaterThan(closedBlockStart);
});
