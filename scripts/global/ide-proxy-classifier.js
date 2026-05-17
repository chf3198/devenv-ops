#!/usr/bin/env node
// ide-proxy-classifier.js — Phase 2 D2 (#1032).
// Pre-router complexity classifier for IDE proxy. Reads turn body,
// emits {complexity, lane, model_group, rationale}.
'use strict';

const PREMIUM_KEYWORDS = ['security', 'vulnerability', 'audit', 'architecture', 'incident', 'race condition', 'concurrency', 'distributed system'];
const HAIKU_KEYWORDS = ['refactor', 'rename', 'extract', 'inline', 'add test', 'fix typo', 'add comment'];
const FLEET_KEYWORDS = ['list', 'show', 'find', 'where', 'what is', 'explain', 'autocomplete', 'add log'];
const LATENCY_SENSITIVE_KEYWORDS = ['urgent', 'live', 'interactive', 'realtime', 'real-time', 'immediately', 'now'];

const FLEET_THRESHOLD = 0.30;
const HAIKU_THRESHOLD = 0.55;
const PREMIUM_THRESHOLD = 0.75;
const LARGE_PROMPT_LEN = 4000;
const SMALL_PROMPT_LEN = 200;

function score(text, keywords) {
  const lower = String(text || '').toLowerCase();
  return keywords.reduce((acc, w) => acc + (lower.includes(w) ? 1 : 0), 0);
}

function complexityScore(turnText, opts = {}) {
  const text = String(turnText || '');
  let value = 0.50;
  value += score(text, PREMIUM_KEYWORDS) * 0.10;
  value -= score(text, FLEET_KEYWORDS) * 0.08;
  value -= score(text, HAIKU_KEYWORDS) * 0.05;
  if (text.length > LARGE_PROMPT_LEN) value += 0.10;
  if (text.length < SMALL_PROMPT_LEN) value -= 0.10;
  if (opts.toolCount && opts.toolCount > 3) value += 0.10;
  if (opts.fileCount && opts.fileCount > 2) value += 0.10;
  return Math.max(0, Math.min(1, value));
}

function decideLane(score) {
  if (score >= PREMIUM_THRESHOLD) return { lane: 'premium', model_group: 'opus' };
  if (score >= HAIKU_THRESHOLD) return { lane: 'haiku', model_group: 'haiku' };
  if (score >= FLEET_THRESHOLD) return { lane: 'fleet', model_group: 'fleet-quality' };
  return { lane: 'free', model_group: 'fleet-fast' };
}

function isLatencySensitive(turnText) {
  return score(turnText, LATENCY_SENSITIVE_KEYWORDS) > 0;
}

function isBatchPreferred(turnText, opts = {}) {
  if (isLatencySensitive(turnText)) return false;
  if (opts.toolCount && opts.toolCount > 0 && opts.toolCount <= 2) return false;
  return complexityScore(turnText, opts) >= HAIKU_THRESHOLD;
}

/** Classify a turn → {complexity, lane, model_group, rationale}.
 * @param {string} turnText - User-facing prompt text.
 * @param {object} [opts] - { toolCount, fileCount }.
 * @returns {{complexity:number, lane:string, model_group:string, rationale:string}} Routing decision.
 */
function classify(turnText, opts = {}) {
  const complexity = complexityScore(turnText, opts);
  const decision = decideLane(complexity);
  const rationale = `score=${complexity.toFixed(2)} (premium≥${PREMIUM_THRESHOLD}, haiku≥${HAIKU_THRESHOLD}, fleet≥${FLEET_THRESHOLD})`;
  return {
    complexity,
    ...decision,
    rationale,
    latency_sensitive: isLatencySensitive(turnText),
    batch_preferred: isBatchPreferred(turnText, opts),
  };
}

if (require.main === module) {
  const text = process.argv.slice(2).join(' ') || 'no input';
  console.log(JSON.stringify(classify(text), null, 2));
}

module.exports = { classify, complexityScore, decideLane,
  isLatencySensitive, isBatchPreferred,
  PREMIUM_THRESHOLD, HAIKU_THRESHOLD, FLEET_THRESHOLD };
