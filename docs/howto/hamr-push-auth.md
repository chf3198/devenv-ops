# HAMR Cache-Stats Push Auth — Runbook

## Overview

`cache-stats-push.js` posts a signed Ed25519 payload to `POST /cache-stats`
on the HAMR Cloudflare Worker. The worker verifies the signature against the
registered public key in the `PUBLISHER_KEYRING` secret.

## Wrangler Authentication (Safe Pattern)

Never pass `CLOUDFLARE_API_TOKEN` as an inline shell argument — it leaks into shell
history and command output. Use the harness wrapper instead:

```sh
node scripts/global/wrangler-auth.js secret put PUBLISHER_KEYRING \
  --config cloudflare/hamr/wrangler.toml
```

The wrapper reads `CLOUDFLARE_API_TOKEN` from `.env` in a child process and never
echoes the value to stdout/stderr or shell history.

## Key Material Precedence

`OPERATOR_KEY_SEED_B64` (in `.env`) takes priority over `~/.megingjord/keys/operator-ed25519.pem`.
If both exist, only `OPERATOR_KEY_SEED_B64` is used. Remove the PEM file if it becomes stale.

## Error: `unknown_key_id`

The `x-hamr-key-id` header value is not present in `PUBLISHER_KEYRING`.

**Fix:**
1. Derive the SPKI from the operator key that will sign requests:
   ```sh
   node -e "
   const crypto = require('node:crypto');
   const seed = Buffer.from(process.env.OPERATOR_KEY_SEED_B64, 'base64');
   const der = Buffer.concat([Buffer.from('302e020100300506032b657004220420','hex'),seed]);
   const priv = crypto.createPrivateKey({key:der,format:'der',type:'pkcs8'});
   const spki = crypto.createPublicKey(priv).export({type:'spki',format:'der'}).toString('base64');
   console.log(JSON.stringify({'operator-default':spki}));
   "
   ```
2. Pipe the output to `wrangler secret put`:
   ```sh
   echo '<json-from-step-1>' | \
     CLOUDFLARE_API_TOKEN=<token> npx wrangler secret put PUBLISHER_KEYRING \
     --config cloudflare/hamr/wrangler.toml
   ```
3. Retry `node scripts/global/cache-stats-push.js`.

## Error: `no_publisher_keyring_configured`

The `PUBLISHER_KEYRING` secret is not set on the Worker at all.
Run step 2 above to create it.

## Error: `bad_signature`

The key in `PUBLISHER_KEYRING` does not match the key signing the request.
Ensure `OPERATOR_KEY_SEED_B64` in `.env` corresponds to the registered SPKI.

## Verifying Quota Freshness

After a successful push, `/quota` should show `stale: false`:
```sh
curl -s https://hamr.chf3198.workers.dev/quota | jq '{hit_rate_7d,stale,last_update_ms}'
```
