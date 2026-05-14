#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const sig = require('./governance-artifact-signature');
const alias = require('./signer-alias');

const args = process.argv.slice(2);
const opt = {};
for (let i = 0; i < args.length; i += 2) if (args[i]?.startsWith('--')) opt[args[i].slice(2)] = args[i + 1] || '';

const registry = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'inventory', 'team-model-signatures.json'), 'utf8'));
const team = (opt.team || 'codex').toLowerCase();
const model = (opt.model || 'gpt-5.4').toLowerCase();
const role = (opt.role || 'collaborator').toLowerCase();
const substrate = (opt.substrate || 'local').toLowerCase();
const deviceName = (opt.device || '').toLowerCase();
const format = opt.format || 'json';
const withCrypto = String(opt['include-crypto'] || '').toLowerCase() === 'true';
const keyFile = opt['private-key-file'] ? path.resolve(opt['private-key-file']) : '';
const device = deviceName ? `/${deviceName}` : '';

function match(entry) {
  return (entry.team === '*' || entry.team === team)
    && new RegExp(entry.modelPattern, 'i').test(model)
    && (!entry.devicePattern || new RegExp(entry.devicePattern, 'i').test(deviceName));
}

function baseLines(payload) {
  return `Signed-by: ${payload.signedBy}\nTeam&Model: ${payload.teamModel}\nRole: ${payload.role}`;
}

const payload = {
  signedBy: alias.canonicalSignerAlias(team, role, model, registry, substrate),
  teamModel: `${team}:${model}@${substrate}${device}`,
  role,
};

// AC3: warn if explicit --team conflicts with substrate-derived team
const substrateTeam = alias.deriveTeamFromSubstrate(substrate, registry);
if (substrateTeam && substrateTeam !== team) {
  process.stderr.write(
    `Warning: substrate "${substrate}" maps to team "${substrateTeam}" but --team is "${team}". ` +
    'Substrate takes precedence for Signed-by; update --team for correct Team&Model field.\n'
  );
  payload.signedBy = alias.canonicalSignerAlias(substrateTeam, role, model, registry, substrate);
}

if (opt['signed-by']) {
  const check = alias.enforceSignerAlias(team, role, opt['signed-by'], { model, registry });
  if (!check.ok) {
    process.stderr.write(`Signed-by mismatch: expected "${check.canonical}" got "${check.provided}".\n`);
    process.exit(1);
  }
  payload.signedBy = check.provided;
}

let text = baseLines(payload);
if (withCrypto) {
  const keyMeta = (registry.cryptoKeys || []).find(k => k.team === team && k.role === role);
  const privateKey = keyFile ? fs.readFileSync(keyFile, 'utf8') : process.env.GOVERNANCE_SIGNING_PRIVATE_KEY_PEM || '';
  if (!keyMeta || !privateKey) {
    process.stderr.write('Missing crypto key metadata or private key (use --private-key-file or GOVERNANCE_SIGNING_PRIVATE_KEY_PEM).\n');
    process.exit(1);
  }
  text = sig.appendSignature(text, sig.signPayload(text, privateKey, keyMeta.keyId));
}

if (format === 'text') console.log(text);
else console.log(JSON.stringify({ ...payload, cryptoIncluded: withCrypto }, null, 2));
