# Blobular Cloud subscription backend

Repository work does not itself migrate, grant access, configure production or deploy.
See [production submission status](PRODUCTION_SUBMISSION.md) for current evidence;
do not repeat completed migrations or grants. The existing test-account upload gate remains the default.
The confirmed StoreKit product is `com.thinknoise.blobular.cloud.monthly`.
Configure its $4.99/month auto-renewable offer in App Store Connect; no client
price or entitlement flag is authoritative. No Web checkout is introduced.

## Existing accounts and Native client

Owner-supplied account records identify **6** as
`blobular-api-test-2b7f0ec7d7ff@example.com`, and **5** as
`dirtytuba@gmail.com` (Dirty Tuba). The owner confirmed ID 5. No accounts are created
and the owner reports migration 003 plus two subsequent production SQL scripts;
active grant rows and audit results have not been independently observed. Do not rerun grants merely
because this checkout lacks a database connection.

PHP users store `password_hash`; `<users>_sessions` stores bearer token hashes.
Login, session lifetime, password changes and account ownership are unchanged.
Cloud writes use `sounds.php` (intent) and `sound.php?id=…` POST (completion).

Read-only inspection of Native's `BlobularCloudClient.swift`,
`CloudSessionStore.swift` and `docs/CLOUD.md` found email/password login returning
`sessionToken`, `userId`, `expiresAt`, followed by bearer-authenticated PHP calls.
Tokens live in the device-only, when-unlocked Keychain. S3 requests are separate.
Native StoreKit PR #8 and archive/versioning PR #9 are merged and tested, as
confirmed by the owner and GitHub merge records. StoreKit provides purchase,
restore, transaction updates, durable retries and server-issued account binding.
No Native code changes are part of this Web repository update.

## Effective entitlement and HTTP contract

Saving requires an active complimentary grant OR an active, verified Apple
subscription (including verified billing grace), unexpired and unrevoked.
Complimentary grants have no automatic expiry. Cancellation keeps the paid term;
billing retry without grace does not permit saves. Refund/revocation removes Apple
privileges without cancelling an independent complimentary grant.

Authenticated `GET /api/subscription.php` returns:

```json
{"ok":true,"subscription":{"active":false,"sources":[],"expiresAt":null,"willRenew":false},"appAccountToken":"server-issued-UUID","authorizationMode":"test-accounts"}
```

`expiresAt` uses Unix seconds (null for complimentary/no active entitlement).
`sources` can contain `complimentary`, `apple`, both or neither. `willRenew`
describes active Apple access. The stable server-issued `appAccountToken` binds
purchases to the account; it is not an authentication token. Responses are no-store.

Purchase/restore: authenticated `POST /api/subscription.php` accepts **only**
`{"transactionId":"numeric Apple transaction ID"}`. PHP calls the private verifier,
which fetches the transaction and current subscription status from Apple, verifies
signed transaction and renewal data using Apple's official SDK with online
certificate checks, and validates bundle, environment, product, ownership and
account token. No decoded client payload, price, expiry or boolean grants access.

Each `(environment, originalTransactionId)` has one immutable Blobular owner.
Restoration requires the matching account token, too. Tokenless older purchases
require separately reviewed reconciliation. Family-shared purchases cannot be
assigned to unrelated Blobular accounts. Duplicate snapshots are idempotent;
older signed data cannot undo newer state. The audit stores event digests, not JWS.

`POST /api/app-store-notifications.php` accepts only `signedPayload`. The SDK
verifies the outer signature and app/environment identity before obtaining fresh
Apple status. Notifications update existing bindings only; unknown purchases wait
for authenticated restoration. They cannot grant complimentary access. Failed
verification returns an error so Apple can retry. Configure Notifications **V2**.

Apple snapshots have a five-minute lease. Notifications revoke earlier; stale
status/save checks refresh from Apple and fail closed on outages when no independent fresh entitlement exists. Failure to
refresh one old purchase does not veto a different freshly verified subscription.
Expiry is evaluated again after verification to cover network delays. A missed
notification can therefore leave a cached privilege effective for at most five
minutes. Expiry uses the server clock. Completion locks the account and rechecks
before publishing and before marking ready, serializing with grant/Apple updates.
Pending denied uploads stay hidden and use existing cleanup. Existing short-lived
S3 capabilities retain their TTL; this does not invalidate previously issued URLs.

List, download and deletion remain available to authenticated owners after expiry.
The entitlement system never deletes recordings. Both HTTP and service boundaries
gate intent creation and completion; the old allowlist cannot bypass entitlement
mode. Invalid rollout modes fail closed.

## Migration and controlled rollout

1. Back up using the existing secure operator procedure. Confirm migrations 001/002,
   InnoDB tables and `INT UNSIGNED` user IDs. Review
   `infra/migrations/003-subscription-entitlements.sql`; replace **every**
   `blobular_users` prefix if the configured users table differs (max 45 characters).
2. Apply 003 **manually after separate approval**. It adds five tables: `_billing`,
   `_comp`, `_subs`, `_iap_log`, `_ent_log`, with owner foreign keys. It does not alter
   users, passwords, sessions or recordings and seeds no grants. MySQL DDL
   auto-commits; inspect partial application before retry. Existing tables cause an
   explicit failure. DDL uses MySQL 5.7-compatible features; tested on 8.0 and 8.4.
3. Keep `cloud_authorization_mode` absent or `test-accounts` and retain the production
   `cloud_test_account_ids` setting. PHP deployment alone cannot broaden access.
4. Provision the private verifier below and perform genuine Sandbox purchase,
   renewal, expiry, refund and restoration tests. Separate Sandbox from Production;
   the client cannot select the server environment or an automatic fallback.
5. Once migration 003 is present in the target database, run the audited CLI from a
   private checkout with authorized DB access. The owner has confirmed account 5's
   identity and requested both grants. This command is a **read-only preview** by
   default and verifies both existing ID/email pairs:

   ```sh
   php scripts/manage-entitlements.php --action=grant --launch-accounts \
     --actor=operator --reason='Owner-approved permanent launch subscriptions'
   ```

   Replace `operator` with the real operator identity; append `--apply` to execute
   the authorized grants in the intended database. Apply locks both accounts in ID
   order and verifies both emails again before writing. It grants both permanent
   entitlements and individual audit records in **one transaction**, or neither if
   any identity/audit step fails. It never creates users or changes the upload
   allowlist/configuration. Repeating it cannot duplicate accounts/entitlements.
   Migration 003 and two subsequent SQL scripts have already been executed in
   production according to the owner. The commands above are an administrative
   reference, not instructions to repeat that work. Use the read-only
   `scripts/verify-launch-entitlements.sql` query to inspect current grants and
   matching audits. Do not install migrations or reapply grants as a side effect
   of verification.

   Individual grant/revoke remains available; these examples are also previews:

   ```sh
   php scripts/manage-entitlements.php --action=grant --user-id=6 \
     --expected-email=blobular-api-test-2b7f0ec7d7ff@example.com \
     --actor=operator --reason='Owner-approved permanent test subscription'
   php scripts/manage-entitlements.php --action=grant --user-id=5 \
     --expected-email=dirtytuba@gmail.com \
     --actor=operator --reason='Owner-approved permanent Dirty Tuba subscription'
   ```

   Replace `operator` with the actual identity. Append `--apply` only when production
   authorization is given. Each grant/revoke checks exact ID **and email**, locks
   the user and commits actor/reason/time audit atomically. `--action=revoke` uses
   the same guards. Shell/DB access is the administrative boundary; there is no
   HTTP grant endpoint. No passwords or DB credentials are printed.
6. Verify grants/status, free-account denial and revocation during completion in
   staging. Then explicitly switch server-owned config to `entitlements` during an
   approved rollout. Rollback: restore `test-accounts`, retaining grants/audits/audio.

PHP server-owned `api/config.php` settings (examples contain no secrets):

| Key | Value |
| --- | --- |
| `cloud_authorization_mode` | `test-accounts` until rollout; then `entitlements` |
| `apple_environment` | `Production` or isolated `Sandbox` |
| `apple_product_ids` | `com.thinknoise.blobular.cloud.monthly` |
| `apple_verifier_url` | Private HTTPS base URL, no userinfo/query |
| `apple_verifier_secret` | At least 32 random characters shared only with verifier |

File values override environment values, including empty strings. Equivalent env
names: `BLOBULAR_CLOUD_AUTHORIZATION_MODE`, `BLOBULAR_APPLE_ENVIRONMENT`,
`BLOBULAR_APPLE_PRODUCT_IDS`, `BLOBULAR_APPLE_VERIFIER_URL`,
`BLOBULAR_APPLE_VERIFIER_SECRET`. Existing database/auth/S3 keys are unchanged.
Never put secrets in `VITE_*`, frontend bundles, source control or deployment output.

## Separate private verifier runtime

`services/apple-verifier` pins the official `@apple/app-store-server-library` SDK.
Requires Node 22+ on a separately managed private runtime; PHP/FTP hosting alone is
insufficient. Run `npm ci --omit=dev` there, provide private runtime settings below,
then `npm start`. Keys/certificates are installed by the operator outside public
folders and are never part of the Web artifact.

| Variable | Meaning |
| --- | --- |
| `APPLE_ENVIRONMENT` | `Production` or `Sandbox`, matching PHP |
| `APPLE_BUNDLE_ID` | Actual Native bundle ID |
| `APPLE_APP_ID` | Numeric app ID; mandatory in Production |
| `APPLE_PRODUCT_IDS` | `com.thinknoise.blobular.cloud.monthly`, matching PHP |
| `APPLE_ISSUER_ID`, `APPLE_KEY_ID` | App Store Connect In-App Purchase API key metadata |
| `APPLE_PRIVATE_KEY_FILE` | Absolute private `.p8` key path |
| `APPLE_ROOT_CA_FILES` | Comma-separated trusted Apple Root CA certificate paths |
| `VERIFIER_SECRET` | Same random private secret as PHP |
| `PORT` | Loopback port; default 3091 |

Obtain trust roots via a trusted administrative channel from
[Apple PKI](https://www.apple.com/certificateauthority/), never the submitted JWS.
The SDK verifies signatures/chains with online certificate checks enabled. Permit
outbound Apple API/certificate-status HTTPS. Supervise the Node process. Put its
loopback listener behind HTTPS termination with bounded upstream time/concurrency
limits; restrict network access to the PHP host where feasible. Both private routes
require the shared secret; PHP verifies TLS and does not follow redirects. Disable
request body/header logging at proxies. Rotate keys/secrets privately.

The manual Deploy Blobular workflow is unchanged: only `dist` is uploaded, runtime
PHP is included, config/examples/migrations/scripts/service/dependencies/keys are
excluded. Config exclusions and `dangerous-clean-slate: false` remain intact. The
private Node service requires its own approved deployment, never FTP publication.

## Remaining Apple and Native rollout work

- Use the confirmed `com.thinknoise.blobular.cloud.monthly` product; verify its
  App Store Connect availability/$4.99 price, bundle/app IDs, API key and
  trusted root certificates; provision the private runtime and V2 notifications.
- Run real Sandbox signed purchase, renewal, restore, refund and expiry flows.
  Automated fixtures verify normalization/binding and actual SDK rejection of
  forged JWS; they do not establish live Apple integration without that setup.
- Native StoreKit integration is merged. Configure its approved, published Privacy
  Policy and Terms URLs in both app build configurations before submission; the
  merged implementation intentionally disables purchases while legal URLs are absent.
- Monitor notification failures privately. Status/save refreshes reconcile missed
  notifications rather than extending stale access beyond the five-minute lease.

References: [App Store Server API](https://developer.apple.com/documentation/appstoreserverapi),
[official Node SDK](https://github.com/apple/app-store-server-library-node),
[SignedDataVerifier](https://apple.github.io/app-store-server-library-node/classes/SignedDataVerifier.html).

## Local checks (disposable fixtures only)

```sh
php tests/backend/entitlements.php
python3 tests/backend/entitlements_http.py
python3 tests/backend/run.py
python3 tests/backend/sounds_http.py
python3 tests/backend/cloud_config.py
php tests/backend/sounds.php
python3 tests/backend/mysql.py
npm --prefix services/apple-verifier ci
npm --prefix services/apple-verifier test
npm run build
python3 tests/backend/deployment.py
```

MySQL tests use cached Docker images with disposable localhost databases. HTTP
tests generate fixture configs and never copy a real config.php. No deployment
hook executes migrations/grants or starts the private service.
