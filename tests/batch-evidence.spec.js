'use strict';

const { test, expect } = require('@playwright/test');
const { isBatchSibling, hasBatchEvidence, validateSiblingEvidence, BATCH_MARKER } =
  require('../scripts/global/megalint/batch-evidence.js');

const VALID_SIBLING = `## CONSULTANT_CLOSEOUT
ticket: #1755 (resolved as part of batch with #1752)
status: review
verdict: approve_for_merge
verification-timestamp: 2026-05-16T20:00:00Z

rubric_rating: 9/10. Full evidence on #1752.

Signed-by: Orla Vale
Team&Model: claude-code:opus-4-7@anthropic
Role: consultant`;

test('isBatchSibling extracts lead ticket number from marker', () => {
  expect(isBatchSibling('resolved as part of batch with #1752')).toBe(1752);
  expect(isBatchSibling('resolved as part of batch with #42')).toBe(42);
});

test('isBatchSibling returns null when marker absent', () => {
  expect(isBatchSibling('plain body without marker')).toBe(null);
  expect(isBatchSibling(null)).toBe(null);
});

test('hasBatchEvidence returns true for valid sibling body', () => {
  expect(hasBatchEvidence(VALID_SIBLING)).toBe(true);
});

test('hasBatchEvidence returns false for plain body', () => {
  expect(hasBatchEvidence('plain body')).toBe(false);
});

test('validateSiblingEvidence returns ok for fully-formed sibling', () => {
  const result = validateSiblingEvidence(VALID_SIBLING);
  expect(result.ok).toBe(true);
  expect(result.leadTicket).toBe(1752);
  expect(result.violations).toEqual([]);
});

test('validateSiblingEvidence flags missing-signed-by', () => {
  const broken = VALID_SIBLING.replace('Signed-by: Orla Vale', '');
  const result = validateSiblingEvidence(broken);
  expect(result.ok).toBe(false);
  expect(result.violations).toContain('missing-signed-by');
});

test('validateSiblingEvidence flags missing-team-model', () => {
  const broken = VALID_SIBLING.replace('Team&Model: claude-code:opus-4-7@anthropic', '');
  const result = validateSiblingEvidence(broken);
  expect(result.ok).toBe(false);
  expect(result.violations).toContain('missing-team-model');
});

test('validateSiblingEvidence flags missing-role-consultant', () => {
  const broken = VALID_SIBLING.replace('Role: consultant', '');
  const result = validateSiblingEvidence(broken);
  expect(result.ok).toBe(false);
  expect(result.violations).toContain('missing-role-consultant');
});

test('validateSiblingEvidence flags missing-verification-timestamp', () => {
  const broken = VALID_SIBLING.replace('verification-timestamp: 2026-05-16T20:00:00Z', '');
  const result = validateSiblingEvidence(broken);
  expect(result.ok).toBe(false);
  expect(result.violations).toContain('missing-verification-timestamp');
});

test('validateSiblingEvidence flags missing-rubric-rating', () => {
  const broken = VALID_SIBLING.replace('rubric_rating: 9/10', 'rating: 9');
  const result = validateSiblingEvidence(broken);
  expect(result.ok).toBe(false);
  expect(result.violations).toContain('missing-rubric-rating');
});

test('validateSiblingEvidence returns no-batch-marker when not a sibling', () => {
  const result = validateSiblingEvidence('Plain comment without the marker');
  expect(result.ok).toBe(false);
  expect(result.reason).toBe('no-batch-marker');
});

test('BATCH_MARKER is case-insensitive', () => {
  expect(BATCH_MARKER.test('RESOLVED AS PART OF BATCH WITH #1234')).toBe(true);
  expect(BATCH_MARKER.test('Resolved as part of batch with #1234')).toBe(true);
});
