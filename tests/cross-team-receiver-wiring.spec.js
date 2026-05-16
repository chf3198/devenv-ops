'use strict';

const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const RECEIVER_PATH = path.join(__dirname, '..', '.github', 'workflows', 'cross-team-event-receiver.yml');
const WRITER_PATH = path.join(__dirname, '..', 'scripts', 'global', 'event-to-board-writer.js');

function read(p) { return fs.readFileSync(p, 'utf8'); }

test('cross-team-event-receiver.yml requires repository-projects: write', () => {
  expect(read(RECEIVER_PATH)).toContain('repository-projects: write');
});

test('cross-team-event-receiver.yml imports event-to-board-writer', () => {
  expect(read(RECEIVER_PATH)).toContain("require('./scripts/global/event-to-board-writer.js')");
});

test('cross-team-event-receiver.yml invokes writeEventToBoard', () => {
  expect(read(RECEIVER_PATH)).toContain('writeEventToBoard');
});

test('cross-team-event-receiver.yml reads PROJECT_V2_NODE_ID env var', () => {
  expect(read(RECEIVER_PATH)).toContain('PROJECT_V2_NODE_ID');
});

test('cross-team-event-receiver.yml writes summary including writeResult', () => {
  expect(read(RECEIVER_PATH)).toContain('writeResult');
});

test('cross-team-event-receiver.yml pins actions to SHA', () => {
  const yml = read(RECEIVER_PATH);
  expect(yml).toContain('actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5');
  expect(yml).toContain('actions/github-script@f28e40c7f34bde8b3046d885e986cb6290c5673b');
});

test('cross-team-event-receiver.yml G6 degradation — failure does not block via try/catch', () => {
  const yml = read(RECEIVER_PATH);
  expect(yml).toContain('try {');
  expect(yml).toContain('degraded:');
});

test('event-to-board-writer recognizes the receiver dispatch event types', () => {
  const writer = read(WRITER_PATH);
  expect(writer).toContain("'cross-team-claim'");
  expect(writer).toContain("'cross-team-release'");
});

test('integration: writer + listener handle cross-team-claim end-to-end', async () => {
  const { writeEventToBoard } = require('../scripts/global/event-to-board-writer.js');
  const { normalize } = require('../scripts/global/cross-team-event-listener.js');
  const event = normalize({ event_type: 'cross-team-claim', client_payload: { issue: { number: 100 } } });
  const ctx = { projectId: 'P', itemId: 'I', fields: { claimedBy: 'F1', inFlightSince: 'F2', lockedPaths: 'F3' } };
  let captured = 0;
  const client = { graphql: () => { captured++; return {}; } };
  const result = await writeEventToBoard(client, ctx, event);
  expect(result.ok).toBe(true);
  expect(captured).toBeGreaterThan(0);
});

test('integration: writer + listener handle cross-team-release end-to-end', async () => {
  const { writeEventToBoard } = require('../scripts/global/event-to-board-writer.js');
  const { normalize } = require('../scripts/global/cross-team-event-listener.js');
  const event = normalize({ event_type: 'cross-team-release', client_payload: {} });
  const ctx = { projectId: 'P', itemId: 'I', fields: { claimedBy: 'F1', inFlightSince: 'F2', lockedPaths: 'F3' } };
  let capturedVars = null;
  const client = { graphql: (_, vars) => { capturedVars = vars; return {}; } };
  const result = await writeEventToBoard(client, ctx, event);
  expect(result.ok).toBe(true);
  expect(capturedVars.value).toEqual({ text: '' });
});
