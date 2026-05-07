#!/usr/bin/env node
// scripts/wiki/answer.js — Karpathy 3rd-layer wiki/answers/ (#1017).
// Answers are long-lived syntheses (vs ephemeral search results).
// Cache-friendly: tagged for extended_cache_ttl per HAMR #1000.
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { listPages, WIKI_DIR } = require('./wiki-io');
const { hybridSearch } = require('./retrieval');

const ANSWERS_DIR = path.join(WIKI_DIR, 'answers');
const SLUG_MAX = 80;

function slugify(question) {
  return question.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, SLUG_MAX);
}

function answerExists(slug) {
  return fs.existsSync(path.join(ANSWERS_DIR, `${slug}.md`));
}

function buildAnswerPage(question, slug, sources, draft) {
  const today = new Date().toISOString().split('T')[0];
  const sourceLinks = sources.map(s => `- [[${s.slug}]] (${s.type}, score: ${s.score.toFixed(2)})`).join('\n');
  return `---
title: "${question.replace(/"/g, '\\"')}"
slug: ${slug}
type: answer
date: ${today}
cache_eligible: true
extended_cache_ttl: true
---

# ${question}

${draft || '(draft answer pending — see linked sources)'}

## Sources

${sourceLinks}
`;
}

/** Compose an answer entry from a question. Does NOT call LLM (caller wraps).
 * @returns {{ok, slug, page_path, sources}}
 */
function composeAnswer(question, opts = {}) {
  fs.mkdirSync(ANSWERS_DIR, { recursive: true });
  const slug = slugify(question);
  if (answerExists(slug) && !opts.overwrite) {
    return { ok: false, reason: 'exists', slug, page_path: path.join(ANSWERS_DIR, `${slug}.md`) };
  }
  const sources = hybridSearch(question, opts.pages || null);
  const page = buildAnswerPage(question, slug, sources, opts.draft || '');
  const pagePath = path.join(ANSWERS_DIR, `${slug}.md`);
  fs.writeFileSync(pagePath, page);
  return { ok: true, slug, page_path: pagePath, sources: sources.map(s => s.slug) };
}

if (require.main === module) {
  const question = process.argv.slice(2).join(' ');
  if (!question) { console.log('Usage: answer.js "your question"'); process.exit(1); }
  console.log(JSON.stringify(composeAnswer(question), null, 2));
}

module.exports = { composeAnswer, slugify, answerExists, ANSWERS_DIR, SLUG_MAX };
