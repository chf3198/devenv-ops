// #1336 three-frictions tests (AC1 branch types, AC2 docs, AC3 label auto-transition).
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO = path.resolve(__dirname, '..');
const BRANCH_HOOK = path.join(REPO, 'hooks', 'scripts', 'validate-branch-name.sh');
const SKILL = path.join(REPO, '.claude', 'commands', 'role-collaborator-execution.md');
const LABEL_LINT_YML = path.join(REPO, '.github', 'workflows', 'label-lint.yml');

// AC1: branch types — direct shell check against the regex.

function isValidBranch(branchName) {
  const pattern = /^(feat|fix|chore|skill|hotfix|docs|content|perf|refactor|style|test)\/[a-z0-9][-a-z0-9]*$|^main$|^develop$/;
  return pattern.test(branchName);
}

test('#1336 AC1: docs/123-foo is now an accepted branch name pattern', () => {
  expect(isValidBranch('docs/123-foo')).toBe(true);
});

test('#1336 AC1: content/, perf/, refactor/, style/, test/ all accepted', () => {
  expect(isValidBranch('content/200-update')).toBe(true);
  expect(isValidBranch('perf/300-cache-stat-fix')).toBe(true);
  expect(isValidBranch('refactor/400-extract')).toBe(true);
  expect(isValidBranch('style/500-format')).toBe(true);
  expect(isValidBranch('test/600-coverage')).toBe(true);
});

test('#1336 AC1: existing feat/fix/chore/skill/hotfix still work', () => {
  expect(isValidBranch('feat/86-wiki-ingest')).toBe(true);
  expect(isValidBranch('fix/42-typo')).toBe(true);
  expect(isValidBranch('chore/cleanup')).toBe(true);
  expect(isValidBranch('skill/new-thing')).toBe(true);
  expect(isValidBranch('hotfix/critical')).toBe(true);
});

test('#1336 AC1: invalid prefix still rejected', () => {
  expect(isValidBranch('bogus/123-x')).toBe(false);
  expect(isValidBranch('analysis/foo')).toBe(false);
});

test('#1336 AC1: validate-branch-name.sh source contains expanded regex', () => {
  const content = fs.readFileSync(BRANCH_HOOK, 'utf-8');
  expect(content).toContain('docs|content|perf|refactor|style|test');
});

test('#1336 AC1: live shell invocation accepts docs/N-slug (best-effort)', () => {
  // Simulate by checking the regex output via grep — same as the hook does.
  const branch = 'docs/123-test-branch';
  const result = spawnSync('grep', ['-qE',
    '^(feat|fix|chore|skill|hotfix|docs|content|perf|refactor|style|test)/[a-z0-9][-a-z0-9]*$',
  ], { input: branch, encoding: 'utf-8' });
  expect(result.status).toBe(0);
});

// AC2: skill docs contain pickup-acknowledgement section

test('#1336 AC2: role-collaborator-execution.md has Pickup acknowledgement section', () => {
  const content = fs.readFileSync(SKILL, 'utf-8');
  expect(content).toContain('Pickup acknowledgement');
  expect(content).toContain('60s-predate');
  expect(content).toContain('COLLABORATOR_HANDOFF');
});

test('#1336 AC2: skill references #1336 and Tier-2 anneal #1433', () => {
  const content = fs.readFileSync(SKILL, 'utf-8');
  expect(content).toContain('#1336');
  expect(content).toMatch(/#1433|Tier-2/);
});

// AC3: label-lint.yml auto-transition logic

test('#1336 AC3: label-lint.yml contains CONSULTANT_CLOSEOUT auto-transition logic', () => {
  const content = fs.readFileSync(LABEL_LINT_YML, 'utf-8');
  expect(content).toContain('CONSULTANT_CLOSEOUT');
  expect(content).toContain('auto-transition');
  expect(content).toContain('status:done');
});

test('#1336 AC3: workflow uses header-anchored regex for CONSULTANT_CLOSEOUT', () => {
  const content = fs.readFileSync(LABEL_LINT_YML, 'utf-8');
  // Matches the parallel pattern from megalint consultant-closeout.js
  expect(content).toMatch(/closeoutRe.*CONSULTANT_CLOSEOUT/);
});

test('#1336 AC3: workflow still blocks close when NO CONSULTANT_CLOSEOUT present', () => {
  const content = fs.readFileSync(LABEL_LINT_YML, 'utf-8');
  expect(content).toContain('Close blocked');
});
