#!/usr/bin/env node
'use strict';

const { execFileSync } = require('child_process');
const leaseRegistry = require('./cross-team-lease-registry');

function parse(args) {
  const out = { _: [] };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg.startsWith('--')) out[arg.slice(2).replace(/-/g, '_')] = args[++i] || true;
    else out._.push(arg);
  }
  return out;
}

function post(issue, body) {
  execFileSync('gh', ['issue', 'comment', String(issue), '--body', body], {
    stdio: 'inherit',
  });
}

function run(argv = process.argv.slice(2)) {
  const args = parse(argv);
  const cmd = args._[0];
  const registry = leaseRegistry.read(args.file || leaseRegistry.DEFAULT_PATH);
  const commands = {
    create: () => leaseRegistry.createLease(registry, args),
    refresh: () => leaseRegistry.refreshLease(registry, args.ticket, args.ttl_hours),
    expire: () => leaseRegistry.expireLeases(registry),
    close: () => leaseRegistry.closeLease(registry, args.ticket),
    list: () => leaseRegistry.active(registry),
  };
  if (!commands[cmd]) throw new Error('usage: create|refresh|expire|close|list');
  const result = commands[cmd]();
  if (cmd !== 'list') leaseRegistry.write(registry, args.file || leaseRegistry.DEFAULT_PATH);
  if (args.post_comment && result && !Array.isArray(result)) {
    post(result.ticket, leaseRegistry.commentBlock(cmd, result));
  }
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  return result;
}

if (require.main === module) {
  try { run(); } catch (error) { console.error(error.message); process.exit(1); }
}

module.exports = { run, parse };
