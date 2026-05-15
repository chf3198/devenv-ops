'use strict';

const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const FILE = path.resolve(__dirname, '..', 'lefthook.yml');

test('lefthook pre-push includes required parity gates', () => {
  const content = fs.readFileSync(FILE, 'utf8');
  const required = [
    'pre-push:',
    'parallel: true',
    'hooks/scripts/validate-branch-name.sh',
    'npm run lint',
    'npm run lint:readability:ci',
    'npm run lint:js',
    'npm run lint:md',
    'npm run lint:py',
    'npm run lint:sh',
    'node scripts/global/megalint/index.js',
    'node scripts/global/closeout-preflight.js',
    'node scripts/global/test-evidence-validator.js --diff-only',
  ];
  for (const marker of required) expect(content).toContain(marker);
});
