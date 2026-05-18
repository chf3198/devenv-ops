'use strict';
// research-first-phase-gate — advisory validator for epic signal + EPIC_RESCOPE guard.

const TERMINAL_OR_NEXT = [
  'status:triage', 'status:ready', 'status:testing', 'status:review',
  'status:done', 'status:cancelled', 'status:dormant', 'status:deferred',
];

function hasRescopeComment(comments) {
  return (comments || []).some(c => /\bEPIC_RESCOPE\b/i.test(c.body || ''));
}

function isResearchFirstEpic(labels, body) {
  const labelSet = new Set(labels || []);
  if (!labelSet.has('type:epic')) return false;
  if (labelSet.has('phase-gate:research-first')) return true;
  return /(^|\n)\s*[-*]?\s*\[[ x]\]\s*AC-R\d+/im.test(body || '');
}

/**
 * Validate research-first Epic phase-gate structure and transition guard.
 * @param {{labels?: string[], body?: string, comments?: Array<{body?: string}>}} input
 * @returns {{ok: boolean, violations: Array<{rule: string, detail: string}>, found: boolean}}
 */
function validate(input) {
  const labels = input.labels || [];
  if (!isResearchFirstEpic(labels, input.body || '')) {
    return { ok: true, violations: [], found: false };
  }

  const violations = [];
  if (!labels.includes('phase-gate:research-first')) {
    violations.push({
      rule: 'missing-phase-gate-label',
      detail: 'Research-first Epic should carry label phase-gate:research-first',
    });
  }

  const hasLeftInProgress = TERMINAL_OR_NEXT.some(label => labels.includes(label));
  if (hasLeftInProgress && !hasRescopeComment(input.comments)) {
    violations.push({
      rule: 'missing-epic-rescope',
      detail: 'Epic left status:in-progress without EPIC_RESCOPE marker comment',
    });
  }

  return { ok: violations.length === 0, violations, found: true };
}

module.exports = { validate, isResearchFirstEpic };
