// Unit tests for scripts/global/baton-team-model.js (Epic #1568 AC-3, #1572).
// Pins the critical-path diversity contract: Admin must differ from Collaborator,
// Consultant must differ from Admin. Cross-model within provider passes; identical
// Team&Model literal fails. Manager-Collaborator may match (intent alignment).
const { test, expect } = require('@playwright/test');
const path = require('path');
const TM = require(path.resolve(__dirname, '..', 'scripts', 'global', 'baton-team-model.js'));

test('parseTeamModel extracts the literal Team&Model line', () => {
  const body = '## COLLABORATOR_HANDOFF\n\nSigned-by: Orla Harper\nTeam&Model: claude-code:opus-4-7@anthropic\nRole: collaborator';
  expect(TM.parseTeamModel(body)).toBe('claude-code:opus-4-7@anthropic');
});

test('parseTeamModel returns null on missing field, empty string, or non-string input', () => {
  expect(TM.parseTeamModel('no signature anywhere here')).toBeNull();
  expect(TM.parseTeamModel('')).toBeNull();
  expect(TM.parseTeamModel(null)).toBeNull();
  expect(TM.parseTeamModel(undefined)).toBeNull();
  expect(TM.parseTeamModel(42)).toBeNull();
});

test('enforceCriticalPathDiversity passes when all critical-path roles use different Team&Model', () => {
  const result = TM.enforceCriticalPathDiversity({
    collaborator: 'claude-code:opus-4-7@anthropic',
    admin: 'claude-code:sonnet-4-6@anthropic',
    consultant: 'fleet:gemma3:1b@ollama',
  });
  expect(result.ok).toBe(true);
  expect(result.violations).toEqual([]);
});

test('enforceCriticalPathDiversity fails when Collaborator and Admin share Team&Model', () => {
  const result = TM.enforceCriticalPathDiversity({
    collaborator: 'claude-code:opus-4-7@anthropic',
    admin: 'claude-code:opus-4-7@anthropic',
    consultant: 'fleet:gemma3:1b@ollama',
  });
  expect(result.ok).toBe(false);
  expect(result.violations).toHaveLength(1);
  expect(result.violations[0].rule).toBe('collab-admin-same-team-model');
});

test('enforceCriticalPathDiversity fails when Admin and Consultant share Team&Model', () => {
  const result = TM.enforceCriticalPathDiversity({
    collaborator: 'claude-code:opus-4-7@anthropic',
    admin: 'claude-code:sonnet-4-6@anthropic',
    consultant: 'claude-code:sonnet-4-6@anthropic',
  });
  expect(result.ok).toBe(false);
  expect(result.violations).toHaveLength(1);
  expect(result.violations[0].rule).toBe('admin-consultant-same-team-model');
});

test('enforceCriticalPathDiversity reports both violations when both critical-path pairs match', () => {
  const result = TM.enforceCriticalPathDiversity({
    collaborator: 'claude-code:opus-4-7@anthropic',
    admin: 'claude-code:opus-4-7@anthropic',
    consultant: 'claude-code:opus-4-7@anthropic',
  });
  expect(result.ok).toBe(false);
  expect(result.violations).toHaveLength(2);
  expect(result.violations.map(v => v.rule)).toEqual([
    'collab-admin-same-team-model',
    'admin-consultant-same-team-model',
  ]);
});

test('enforceCriticalPathDiversity is skipped when the override label is present', () => {
  const result = TM.enforceCriticalPathDiversity({
    collaborator: 'claude-code:opus-4-7@anthropic',
    admin: 'claude-code:opus-4-7@anthropic',
    consultant: 'claude-code:opus-4-7@anthropic',
    labels: ['model-diversity:waived'],
  });
  expect(result.ok).toBe(true);
  expect(result.violations).toEqual([]);
  expect(result.skipped).toBe('override-waived');
});

test('cross-model within provider PASSES (Opus vs Sonnet is acceptable per #1568 decision)', () => {
  const result = TM.enforceCriticalPathDiversity({
    collaborator: 'claude-code:opus-4-7@anthropic',
    admin: 'claude-code:sonnet-4-6@anthropic',
    consultant: 'claude-code:haiku-4-5@anthropic',
  });
  expect(result.ok).toBe(true);
});

test('extractFromComments routes Team&Model by artifact header to the correct role slot', () => {
  const result = TM.extractFromComments([
    { body: '## MANAGER_HANDOFF\nTeam&Model: claude-code:opus-4-7@anthropic' },
    { body: '## COLLABORATOR_HANDOFF\nTeam&Model: claude-code:opus-4-7@anthropic' },
    { body: '## ADMIN_HANDOFF\nTeam&Model: claude-code:sonnet-4-6@anthropic' },
    { body: '## CONSULTANT_CLOSEOUT\nTeam&Model: fleet:gemma3:1b@ollama' },
  ]);
  expect(result.collaborator).toBe('claude-code:opus-4-7@anthropic');
  expect(result.admin).toBe('claude-code:sonnet-4-6@anthropic');
  expect(result.consultant).toBe('fleet:gemma3:1b@ollama');
});

test('extractFromComments tolerates comments without Team&Model field (returns null per slot)', () => {
  const result = TM.extractFromComments([
    { body: 'no handoff header, no signature' },
    { body: '## COLLABORATOR_HANDOFF\nno team-model line either' },
  ]);
  expect(result.collaborator).toBeNull();
  expect(result.admin).toBeNull();
  expect(result.consultant).toBeNull();
});

test('Manager-Collaborator match alone does NOT trigger a violation (intent alignment allowed)', () => {
  // Verifies the design choice: shared intent between Manager and Collaborator
  // is acceptable; only review independence (Collab vs Admin, Admin vs Consultant) matters.
  const result = TM.enforceCriticalPathDiversity({
    collaborator: 'claude-code:opus-4-7@anthropic',
    admin: 'claude-code:sonnet-4-6@anthropic',
    consultant: 'fleet:gemma3:1b@ollama',
  });
  expect(result.ok).toBe(true);
  expect(result.violations).toEqual([]);
});
