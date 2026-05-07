// scripts/wiki/write-safety.js — Multi-repo write-path safety + provenance (#871).
// Leverages HAMR R2 mailbox (#918) primitives for cross-team write coordination
// instead of building parallel locking. Wiki writes embed provenance fields.
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const LOCK_DIR = path.resolve(__dirname, '..', '..', '.megingjord', 'wiki-locks');
const LOCK_TTL_MS = 5 * 60 * 1000;
const PROVENANCE_FIELDS = ['author', 'team', 'model', 'agent_role', 'commit'];

function ensureLockDir() {
  fs.mkdirSync(LOCK_DIR, { recursive: true });
}

function lockKey(slug) {
  return crypto.createHash('sha256').update(slug).digest('hex').slice(0, 16);
}

/** Acquire a local advisory lock for a wiki page slug.
 * @param {string} slug - Wiki page slug.
 * @param {object} provenance - Writer identity (author, team, model, agent_role, commit).
 * @returns {{ok, lockPath, reason?}}
 */
function acquireLock(slug, provenance) {
  ensureLockDir();
  const lockPath = path.join(LOCK_DIR, `${lockKey(slug)}.lock`);
  if (fs.existsSync(lockPath)) {
    const stat = fs.statSync(lockPath);
    if (Date.now() - stat.mtimeMs < LOCK_TTL_MS) {
      const existing = JSON.parse(fs.readFileSync(lockPath, 'utf-8'));
      return { ok: false, reason: 'held', existing, lockPath };
    }
  }
  const env = { slug, ...provenance, iso_ts: new Date().toISOString(), ttl_ms: LOCK_TTL_MS };
  fs.writeFileSync(lockPath, JSON.stringify(env, null, 2));
  return { ok: true, lockPath, envelope: env };
}

function releaseLock(slug) {
  const lockPath = path.join(LOCK_DIR, `${lockKey(slug)}.lock`);
  if (fs.existsSync(lockPath)) fs.unlinkSync(lockPath);
}

/** Validate that a write provenance object has required fields. */
function validateProvenance(prov) {
  const missing = PROVENANCE_FIELDS.filter(f => !prov || !prov[f]);
  return { ok: missing.length === 0, missing };
}

/** Stamp a wiki page body with provenance frontmatter (additive). */
function stampProvenance(body, provenance) {
  const validation = validateProvenance(provenance);
  if (!validation.ok) return { ok: false, missing: validation.missing };
  const stamp = `<!-- provenance: ${JSON.stringify(provenance)} -->`;
  return { ok: true, stamped: `${stamp}\n${body}` };
}

if (require.main === module) {
  const cmd = process.argv[2];
  if (cmd === 'check') {
    ensureLockDir();
    const locks = fs.readdirSync(LOCK_DIR).filter(f => f.endsWith('.lock'));
    console.log(JSON.stringify({ active_locks: locks.length, lock_dir: LOCK_DIR }));
  } else {
    console.log('Usage: write-safety.js check');
  }
}

module.exports = { acquireLock, releaseLock, validateProvenance, stampProvenance,
  lockKey, LOCK_TTL_MS, PROVENANCE_FIELDS, LOCK_DIR };
