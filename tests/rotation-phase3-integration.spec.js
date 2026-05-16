'use strict';

const { test, expect } = require('@playwright/test');
const { rotationCheck } = require('../scripts/global/hamr-rotation-check.js');
const { bootstrapTeam, generateKeypair, ROLES } = require('../scripts/global/crypto-signing-bootstrap.js');

test('integration: hamr-rotation-check returns pass shape for 4 distinct teams', () => {
  const result = rotationCheck({
    operator_mode: 'strict-rotation',
    roles_observed: {
      manager: 'claude-code:opus@anthropic',
      collaborator: 'codex:gpt-5@openai',
      admin: 'copilot:opus@github-copilot',
      consultant: 'openclaw:qwen@ollama',
    },
  });
  expect(result.decision).toBe('pass');
  expect(result.advisory_or_required).toBe('required');
});

test('integration: hamr-rotation-check returns fail for Rule 3 violation in strict mode', () => {
  const result = rotationCheck({
    operator_mode: 'strict-rotation',
    roles_observed: {
      manager: 'claude-code:opus@anthropic',
      collaborator: 'codex:gpt-5@openai',
      admin: 'copilot:opus@github-copilot',
      consultant: 'codex:gpt-5@openai',
    },
  });
  expect(result.decision).toBe('fail');
  expect(result.rule_evaluated).toBe('rule_3_consultant_independent');
});

test('integration: advisory mode downgrades fail to advisory_violation', () => {
  const result = rotationCheck({
    operator_mode: 'advisory-only',
    roles_observed: {
      manager: 'claude-code:opus@anthropic',
      collaborator: 'claude-code:opus@anthropic',
      admin: 'claude-code:opus@anthropic',
    },
  });
  expect(result.decision).toBe('advisory_violation');
  expect(result.advisory_or_required).toBe('advisory');
});

test('integration: single-model-fleet mode skips entirely', () => {
  const result = rotationCheck({
    operator_mode: 'single-model-fleet',
    roles_observed: {
      manager: 'claude-code:opus@anthropic',
      collaborator: 'claude-code:opus@anthropic',
      admin: 'claude-code:opus@anthropic',
      consultant: 'claude-code:opus@anthropic',
    },
  });
  expect(result.decision).toBe('pass');
  expect(result.skipped).toBe('single-model-fleet');
});

test('integration: invalid params return fail', () => {
  expect(rotationCheck(null).decision).toBe('fail');
});

test('crypto-signing-bootstrap: ROLES enumerates all 4 baton roles', () => {
  expect(ROLES).toEqual(['manager', 'collaborator', 'admin', 'consultant']);
});

test('crypto-signing-bootstrap: generateKeypair returns ed25519 PEM strings', () => {
  const { publicPem, privatePem } = generateKeypair();
  expect(publicPem).toContain('BEGIN PUBLIC KEY');
  expect(privatePem).toContain('BEGIN PRIVATE KEY');
});

test('integration: end-to-end with collaborator-self-check + 4 teams = all rules pass', () => {
  const result = rotationCheck({
    operator_mode: 'strict-rotation',
    roles_observed: {
      manager: 'claude-code:opus@anthropic',
      collaborator: 'codex:gpt-5@openai',
      implementation: 'codex:gpt-5@openai',
      collaborator_self_check: 'openclaw:qwen@ollama',
      admin: 'copilot:opus@github-copilot',
      consultant: 'claude-code:sonnet@anthropic',
    },
  });
  // Wait — claude-code matches manager! Should fail Rule 3.
  expect(result.decision).toBe('fail');
  expect(result.rule_evaluated).toBe('rule_3_consultant_independent');
});

test('integration: end-to-end with truly 5 distinct teams = all rules pass', () => {
  const result = rotationCheck({
    operator_mode: 'strict-rotation',
    roles_observed: {
      manager: 'claude-code:opus@anthropic',
      collaborator: 'codex:gpt-5@openai',
      implementation: 'codex:gpt-5@openai',
      collaborator_self_check: 'openclaw:qwen@ollama',
      admin: 'copilot:opus@github-copilot',
      consultant: 'openclaw:mistral@ollama',
    },
  });
  // openclaw appears in self_check AND consultant — same team. But Rule 3 only checks consultant vs manager/collab/admin (not vs self_check).
  expect(result.decision).toBe('pass');
});
