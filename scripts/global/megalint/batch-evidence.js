'use strict';
// batch-evidence (#1714) — recognizes the "resolved as part of batch with #N"
// sibling-evidence pattern as valid CONSULTANT_CLOSEOUT evidence per the
// Multi-Close PR batching contract in role-baton-routing.instructions.md.

const BATCH_MARKER = /resolved as part of batch with\s+#(\d{2,5})/i;

function isBatchSibling(commentBody) {
  if (typeof commentBody !== 'string') return null;
  const match = commentBody.match(BATCH_MARKER);
  return match ? parseInt(match[1], 10) : null;
}

function hasBatchEvidence(commentBody) {
  return isBatchSibling(commentBody) !== null;
}

function siblingRequiredFields() {
  return ['Signed-by', 'Team&Model', 'Role', 'verification-timestamp', 'rubric_rating'];
}

function validateSiblingEvidence(commentBody) {
  if (!hasBatchEvidence(commentBody)) {
    return { ok: false, reason: 'no-batch-marker' };
  }
  const violations = [];
  if (!/Signed-by:/i.test(commentBody)) violations.push('missing-signed-by');
  if (!/Team&Model:/i.test(commentBody)) violations.push('missing-team-model');
  if (!/Role:\s*consultant/i.test(commentBody)) violations.push('missing-role-consultant');
  if (!/verification[ _-]?timestamp/i.test(commentBody)) violations.push('missing-verification-timestamp');
  if (!/rubric_rating:\s*\d+\s*\/\s*10/.test(commentBody)) violations.push('missing-rubric-rating');
  return {
    ok: violations.length === 0,
    leadTicket: isBatchSibling(commentBody),
    violations,
  };
}

module.exports = { isBatchSibling, hasBatchEvidence, validateSiblingEvidence, siblingRequiredFields, BATCH_MARKER };
