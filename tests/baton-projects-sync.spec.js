'use strict';

const { test, expect } = require('@playwright/test');
const { detectArtifactType, extractTeam, syncOnArtifact } = require('../scripts/global/baton-projects-sync.js');

const MGR = `## MANAGER_HANDOFF
ticket: #1234
scope: test
Team&Model: claude-code:opus-4-7@anthropic
Role: manager`;

const COLLAB = `## COLLABORATOR_HANDOFF
Team&Model: codex:gpt-5@openai
Role: collaborator`;

const CONS = `## CONSULTANT_CLOSEOUT
Team&Model: copilot:sonnet@github-copilot
Role: consultant`;

function fakeClient(handler) { return { graphql: handler }; }
const CTX = { projectId: 'P', itemId: 'I', fields: { claimedBy: 'F1', inFlightSince: 'F2', lockedPaths: 'F3' } };

test('detectArtifactType detects MANAGER_HANDOFF', () => {
  expect(detectArtifactType(MGR)).toBe('manager');
});

test('detectArtifactType detects CONSULTANT_CLOSEOUT', () => {
  expect(detectArtifactType(CONS)).toBe('consultant');
});

test('detectArtifactType detects COLLABORATOR_HANDOFF', () => {
  expect(detectArtifactType(COLLAB)).toBe('collaborator');
});

test('detectArtifactType returns null for non-artifact bodies', () => {
  expect(detectArtifactType('plain comment')).toBe(null);
  expect(detectArtifactType(null)).toBe(null);
});

test('extractTeam pulls team from Team&Model line', () => {
  expect(extractTeam(MGR)).toBe('claude-code');
  expect(extractTeam(COLLAB)).toBe('codex');
  expect(extractTeam('no team line here')).toBe(null);
});

test('syncOnArtifact routes manager artifacts to onManagerHandoff', async () => {
  let calls = 0;
  const client = fakeClient(() => { calls++; return {}; });
  const result = await syncOnArtifact({ client, ctx: CTX, commentBody: MGR });
  expect(calls).toBeGreaterThan(0);
  expect(result.ok).toBe(true);
});

test('syncOnArtifact routes consultant artifacts to onConsultantCloseout', async () => {
  let captured = null;
  const client = fakeClient((_, vars) => { captured = vars; return {}; });
  const result = await syncOnArtifact({ client, ctx: CTX, commentBody: CONS });
  expect(result.ok).toBe(true);
  expect(captured.value).toEqual({ text: '' });
});

test('syncOnArtifact skips collaborator when no locked-path provided', async () => {
  const client = fakeClient(() => { throw new Error('should not call'); });
  const result = await syncOnArtifact({ client, ctx: CTX, commentBody: COLLAB });
  expect(result.skipped).toBe('no-locked-path');
});

test('syncOnArtifact returns reason for unknown body', async () => {
  const client = fakeClient(() => ({}));
  const result = await syncOnArtifact({ client, ctx: CTX, commentBody: 'plain' });
  expect(result.ok).toBe(false);
  expect(result.reason).toBe('no-artifact-marker');
});

test('syncOnArtifact handles GraphQL errors gracefully (G6 degradation)', async () => {
  const client = fakeClient(() => { throw new Error('graphql 500'); });
  const result = await syncOnArtifact({ client, ctx: CTX, commentBody: MGR });
  // The wrapper inside baton-projects-integration catches the error and returns degraded:true
  expect(result.degraded || result.ok === false).toBeTruthy();
});

test('syncOnArtifact passes lockedPath through to onCollaboratorHandoff', async () => {
  let captured = null;
  const client = fakeClient((_, vars) => { captured = vars; return {}; });
  const result = await syncOnArtifact({ client, ctx: CTX, commentBody: COLLAB, lockedPath: 'src/foo.js' });
  expect(result.ok).toBe(true);
  expect(captured.value).toEqual({ text: 'src/foo.js' });
});
