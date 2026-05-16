'use strict';

const { test, expect } = require('@playwright/test');
const { extractRefsTicket, replayPR, aggregateReplay } = require('../scripts/global/soak-replay-runner.js');

test('extractRefsTicket extracts ticket from PR body', () => {
  expect(extractRefsTicket('Refs #1234')).toBe(1234);
  expect(extractRefsTicket('refs #42\nMore text')).toBe(42);
  expect(extractRefsTicket('no refs here')).toBe(null);
  expect(extractRefsTicket('')).toBe(null);
});

test('aggregateReplay computes compliance_rate', () => {
  const results = [
    { pr: 1, ok: true, violations: [] },
    { pr: 2, ok: false, violations: [{ rule: 'rule_2_admin_diversity' }] },
    { pr: 3, ok: false, violations: [{ rule: 'rule_3_consultant_independent' }] },
    { pr: 4, skipped: 'no-refs' },
  ];
  const summary = aggregateReplay(results);
  expect(summary.total).toBe(4);
  expect(summary.skipped).toBe(1);
  expect(summary.evaluated).toBe(3);
  expect(summary.passes).toBe(1);
  expect(summary.violations).toBe(2);
  expect(summary.compliance_rate).toBe('0.333');
});

test('aggregateReplay tallies rule_violations correctly', () => {
  const results = [
    { pr: 1, ok: false, violations: [{ rule: 'rule_2_admin_diversity' }, { rule: 'rule_3_consultant_independent' }] },
    { pr: 2, ok: false, violations: [{ rule: 'rule_2_admin_diversity' }] },
  ];
  const summary = aggregateReplay(results);
  expect(summary.rule_violations.rule_2_admin_diversity).toBe(2);
  expect(summary.rule_violations.rule_3_consultant_independent).toBe(1);
});

test('aggregateReplay handles empty input', () => {
  const summary = aggregateReplay([]);
  expect(summary.total).toBe(0);
  expect(summary.compliance_rate).toBe('N/A');
});

test('aggregateReplay sample_violations capped at 5', () => {
  const results = Array.from({ length: 10 }, (_, i) => ({
    pr: i + 1, ok: false, violations: [{ rule: 'rule_2_admin_diversity' }],
  }));
  const summary = aggregateReplay(results);
  expect(summary.sample_violations).toHaveLength(5);
});

test('replayPR returns skipped for body without Refs', () => {
  const result = replayPR({ number: 999, body: 'No Refs', closedAt: null });
  expect(result.skipped).toBe('no-refs');
  expect(result.pr).toBe(999);
});
