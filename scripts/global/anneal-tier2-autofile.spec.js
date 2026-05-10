#!/usr/bin/env node
'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { buildCandidates } = require('./anneal-tier2-autofile');

const FIXTURE = path.join(__dirname, '../../tests/fixtures/anneal-tier2-events.json');
const EXPECTED = path.join(__dirname, '../../tests/fixtures/anneal-tier2-expected.json');
const TMP = path.join(os.tmpdir(), `tier2-${Date.now()}.json`);

function testCandidates() {
  const events = JSON.parse(fs.readFileSync(FIXTURE, 'utf8')).events;
  const expected = JSON.parse(fs.readFileSync(EXPECTED, 'utf8')).records;
  const got = buildCandidates(events).map((item) => ({ pattern_id: item.pattern_id, severity: item.severity }));
  assert.deepStrictEqual(got, expected);
}

function testFixtureReadable() {
  fs.writeFileSync(TMP, fs.readFileSync(FIXTURE, 'utf8'));
  assert.ok(fs.existsSync(TMP));
  fs.unlinkSync(TMP);
}

testCandidates();
testFixtureReadable();
process.stdout.write('anneal-tier2-autofile.spec: PASS\n');
