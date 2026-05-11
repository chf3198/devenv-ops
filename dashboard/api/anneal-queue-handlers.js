#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const INCIDENTS = path.join(os.homedir(), '.megingjord', 'incidents.jsonl');

function isAnnealQueueEvent(event) {
  const tier = Number(event.tier || '0');
  return String(event.epic_ref || '') === '#1308' && [1, 2, 3].includes(tier);
}

function readAnnealEvents() {
  if (!fs.existsSync(INCIDENTS)) return [];
  return fs.readFileSync(INCIDENTS, 'utf8').split('\n').filter(Boolean).map((line) => {
    try { return JSON.parse(line); } catch { return null; }
  }).filter(Boolean).filter(isAnnealQueueEvent);
}

function handleAnnealQueue(_request, response) {
  const body = JSON.stringify({ events: readAnnealEvents(), source: INCIDENTS });
  response.writeHead(Number('200'), { 'Content-Type': 'application/json' });
  response.end(body);
}

module.exports = { route: '/api/anneal/queue', handleAnnealQueue, readAnnealEvents };
