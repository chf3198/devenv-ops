const { test, expect } = require('@playwright/test');
const { generateKeyPairSync } = require('crypto');
const sig = require('../scripts/global/governance-artifact-signature');

test('appendSignature keeps human-friendly signature fields', () => {
  const body = 'Signed-by: Cole Mason\nTeam&Model: codex:gpt-5@codex-cli\nRole: manager';
  const out = sig.appendSignature(body, { algorithm: 'ed25519', keyId: 'k1', signature: 'abc' });
  expect(out).toContain('Signed-by: Cole Mason');
  expect(out).toContain('Team&Model: codex:gpt-5@codex-cli');
  expect(out).toContain('Role: manager');
  expect(out).toContain('Crypto-Key-Id: k1');
});

test('verifyArtifact validates valid signature with key override', () => {
  const kp = generateKeyPairSync('ed25519');
  const pub = kp.publicKey.export({ type: 'spki', format: 'pem' }).toString().trim();
  const priv = kp.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
  const base = 'Signed-by: Yara Vale\nTeam&Model: codex:gpt-5@codex-cli\nRole: consultant';
  const signed = sig.appendSignature(base, sig.signPayload(base, priv, 'codex-consultant-v1'));
  const keys = [{ team: 'codex', role: 'consultant', keyId: 'codex-consultant-v1', publicKey: pub }];
  const res = sig.verifyArtifact(signed, 'consultant', keys);
  expect(res.ok).toBe(true);
});

test('verifyArtifact rejects missing crypto fields', () => {
  const body = 'Signed-by: Cole Mason\nTeam&Model: codex:gpt-5@codex-cli\nRole: manager';
  const res = sig.verifyArtifact(body, 'manager', []);
  expect(res.ok).toBe(false);
  expect(res.violations.some(v => /Missing Crypto-Key-Id/.test(v))).toBe(true);
});
