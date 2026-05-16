# How to: Add a New Governance Adapter

**Audience**: New runtime team (e.g., Firefly orchestrator)  
**Time**: ~2 hours  
**Reference**: `instructions/canonical-governance-anti-duplication.instructions.md`

## Overview

This guide walks you through adding a new orchestrator adapter that consumes shared governance contracts from the main repo while respecting your orchestrator's specific permission/capability model.

## Example: Firefly Adapter

We'll use Firefly as the example orchestrator.

### Step 1: Understand the Shared Contract

First, identify the governance contract your orchestrator needs. Example: authorization profiles.

```bash
cat config/authorization-profiles.json
```

Output:
```json
{
  "profiles": {
    "owner": { "install": true, "upgrade": true, "privileged": true, ... },
    "guarded": { "install": false, "upgrade": true, ... },
    "restricted": { "install": false, "upgrade": false, ... }
  }
}
```

**Action**: Read the shared contract's instruction or README to understand its design.

```bash
cat instructions/authorization-profile-context.instructions.md
```

### Step 2: Design Your Adapter

Map the shared contract to your orchestrator's model.

**Example for Firefly**:
- Firefly uses role-based permissions: `admin`, `operator`, `viewer`, `readonly`
- Map shared profiles to Firefly roles:
  - `owner` → `admin`
  - `guarded` → `operator`
  - `restricted` → `viewer`

**Adapter pseudo-code**:
```javascript
function getFireflyProfile(baseProfile) {
  const roleMap = {
    owner: 'admin',
    guarded: 'operator',
    restricted: 'viewer',
  };
  return {
    firefly_role: roleMap[baseProfile.profile],
    capabilities: baseProfile.capabilities, // pass-through
  };
}
```

### Step 3: Create Adapter File Structure

```bash
mkdir -p scripts/global/adapters/firefly
touch scripts/global/adapters/firefly/authorization-profile.adapter.js
touch scripts/global/adapters/firefly/authorization-profile.adapter.spec.js
```

### Step 4: Implement the Adapter

**File: `scripts/global/adapters/firefly/authorization-profile.adapter.js`**

```javascript
#!/usr/bin/env node
'use strict';

const { parseActiveProfile, readSchema } = require('../../authorization-profile');

// Firefly's native role model
const FIREFLY_ROLES = ['admin', 'operator', 'viewer', 'readonly'];

function mapToFireflyRole(profile) {
  const roleMap = {
    owner: 'admin',
    guarded: 'operator',
    restricted: 'viewer',
  };
  return roleMap[profile.profile] || 'viewer';
}

function getFireflyProfile(opts = {}) {
  const schema = opts.schema || require('../../../config/authorization-profiles.json');
  const baseProfile = parseActiveProfile({ schema });
  
  const fireflyRole = mapToFireflyRole(baseProfile);
  if (!FIREFLY_ROLES.includes(fireflyRole)) {
    throw new Error(`Invalid Firefly role: ${fireflyRole}`);
  }

  return {
    profile: baseProfile.profile,
    firefly_role: fireflyRole,
    capabilities: baseProfile.capabilities,
    source: baseProfile.source,
    timestamp: new Date().toISOString(),
  };
}

function main() {
  const asJson = process.argv.includes('--json');
  try {
    const profile = getFireflyProfile();
    if (asJson) {
      process.stdout.write(JSON.stringify(profile, null, 2) + '\n');
    } else {
      process.stdout.write(`Profile: ${profile.profile}\nFirefly Role: ${profile.firefly_role}\n`);
    }
  } catch (e) {
    process.stderr.write(`firefly-authorization-profile: ${e.message}\n`);
    process.exit(2);
  }
}

module.exports = { getFireflyProfile, mapToFireflyRole, FIREFLY_ROLES };
if (require.main === module) main();
```

### Step 5: Test the Adapter

**File: `scripts/global/adapters/firefly/authorization-profile.adapter.spec.js`**

```javascript
#!/usr/bin/env node
'use strict';

const assert = require('assert');
const { getFireflyProfile, mapToFireflyRole } = require('./authorization-profile.adapter');

let pass = 0; let fail = 0;
function test(name, fn) {
  try { fn(); pass++; process.stdout.write(`✓ ${name}\n`); }
  catch (e) { fail++; process.stderr.write(`✗ ${name}: ${e.message}\n`); }
}

const schema = {
  schemaVersion: 1,
  defaultProfile: 'owner',
  profiles: {
    owner: { install: true, upgrade: true, privileged: true, execute_local: true, execute_remote: true },
    guarded: { install: false, upgrade: true, privileged: false, execute_local: true, execute_remote: true },
    restricted: { install: false, upgrade: false, privileged: false, execute_local: true, execute_remote: false },
  },
};

console.log('\n[Firefly Adapter Mapping]');
test('owner maps to admin', () => {
  assert.strictEqual(mapToFireflyRole({ profile: 'owner' }), 'admin');
});
test('guarded maps to operator', () => {
  assert.strictEqual(mapToFireflyRole({ profile: 'guarded' }), 'operator');
});
test('restricted maps to viewer', () => {
  assert.strictEqual(mapToFireflyRole({ profile: 'restricted' }), 'viewer');
});

console.log('\n[Firefly Profile Integration]');
test('getFireflyProfile includes base profile fields', () => {
  const profile = getFireflyProfile({ schema });
  assert.ok(profile.profile);
  assert.ok(profile.capabilities);
  assert.ok(profile.firefly_role);
});
test('getFireflyProfile includes timestamp', () => {
  const profile = getFireflyProfile({ schema });
  assert.ok(profile.timestamp);
  assert.ok(/\d{4}-\d{2}-\d{2}T/.test(profile.timestamp));
});

process.stdout.write(`\nResults: ${pass} passed, ${fail} failed\n`);
if (fail) process.exit(1);
```

Run the test:
```bash
node scripts/global/adapters/firefly/authorization-profile.adapter.spec.js
```

Expected output:
```
[Firefly Adapter Mapping]
✓ owner maps to admin
✓ guarded maps to operator
✓ restricted maps to viewer

[Firefly Profile Integration]
✓ getFireflyProfile includes base profile fields
✓ getFireflyProfile includes timestamp

Results: 5 passed, 0 failed
```

### Step 6: Add npm Script

Update `package.json`:

```json
{
  "scripts": {
    "adapters:firefly:auth-profile": "node scripts/global/adapters/firefly/authorization-profile.adapter.js"
  }
}
```

Test it:
```bash
npm run adapters:firefly:auth-profile -- --json
```

### Step 7: Document in README

Create `docs/adapters/firefly.md`:

```markdown
# Firefly Orchestrator Adapter

Implements governance contracts for Firefly orchestrator.

## Contracts Implemented

### Authorization Profiles
- **Shared contract**: `config/authorization-profiles.json`
- **Adapter**: `scripts/global/adapters/firefly/authorization-profile.adapter.js`
- **CLI**: `npm run adapters:firefly:auth-profile`
- **Mapping**: owner→admin, guarded→operator, restricted→viewer
- **Tests**: `scripts/global/adapters/firefly/authorization-profile.adapter.spec.js`

## Usage

```bash
npm run adapters:firefly:auth-profile -- --json
# Output: Firefly-native role + shared capabilities
```

## Verification

```bash
node scripts/global/adapters/firefly/authorization-profile.adapter.spec.js
# Expected: All tests pass
```

## Adding More Contracts

To add a second contract (e.g., routing policy):
1. Copy adapter template: `authorization-profile.adapter.js`
2. Create `routing-policy.adapter.js` in same folder
3. Add test file: `routing-policy.adapter.spec.js`
4. Update README and npm script
5. Verify via `npm run adapters:firefly:routing-policy`

## Support

- Questions? See `instructions/canonical-governance-anti-duplication.instructions.md`
- Related: #1758 (authorization profiles), #1699 (adapter onboarding)
```

### Step 8: Verify and Deploy

```bash
# Local verification
npm run adapters:firefly:auth-profile
npm run adapters:firefly:auth-profile -- --json

# Add to git and create PR
git add scripts/global/adapters/firefly/
git add docs/adapters/firefly.md
git add package.json
git commit -m "feat: add Firefly governance adapter (authorization profiles)"

# Push and create PR
git push origin feat/firefly-adapter
gh pr create --title "feat: Firefly governance adapter" --body "Implements authorization profile adapter for Firefly orchestrator"
```

## Checklist

- [ ] Adapter implements mapping from shared contract to orchestrator model
- [ ] Unit tests cover all profile mappings
- [ ] CLI tool works: `npm run adapters:firefly:<contract>`
- [ ] Adapter respects shared schema validation
- [ ] Documentation exists in `docs/adapters/`
- [ ] PR references governance contract issues (#1758, #1699, etc.)
- [ ] Lint passes: `npm run lint`
- [ ] Adapter tests pass locally

## Next: Deploy Your Adapter

Once PR is merged, the adapter is available in the repo. To activate in Firefly runtime:

```bash
npm run deploy -- --target firefly --apply
```

This copies your adapter to the Firefly runtime directory where it can be used by Firefly agents.

## Questions?

Refer to:
- Shared contract instruction: `instructions/authorization-profile-context.instructions.md`
- Anti-duplication pattern: `instructions/canonical-governance-anti-duplication.instructions.md`
- Related tickets: #1758, #1699, #1694
