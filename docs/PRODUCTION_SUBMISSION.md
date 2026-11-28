# Production subscription submission status

Evidence reviewed November 27, 2026. This document authorizes no production writes,
deployment, account changes or upload-policy changes.

## Completed work — do not repeat

- Web PR #25 is merged (`d9e315f`): private Apple SDK verification, subscription
  account binding, entitlement enforcement and atomic audited administrative grants exist.
- Native StoreKit PR #8 and archive/versioning PR #9 are merged and tested, confirmed
  by the owner and GitHub merge records. They do not need reimplementation.
- The owner reports migration 003 and two subsequent SQL scripts executed in production.
  Earlier screenshots verified exact IDs/emails for accounts 5 and 6. The later SQL
  outputs were not supplied; execution alone does not establish active grant rows.

## Complimentary grants: verify, do not reapply

In production phpMyAdmin run the unchanged read-only contents of
[`scripts/verify-launch-entitlements.sql`](../scripts/verify-launch-entitlements.sql).
Require both rows to report `MATCH`, `permanent_comp_active = 1`, and
`matching_audit_exists = 1`. This checks the current row and an audit with the same
account/grant timestamp and nonempty operator/reason. It does not prove the identity
of the human operator or substitute for reviewing an audit when investigating a discrepancy.

No remote production database session was available during this review. Do not
infer a missing grant from that access limitation or repeat the completed SQL.
If all three checks pass for both accounts, no grant work remains.

## Verifier configuration and genuine Apple verification

The implementation and pinned Apple SDK already exist in `services/apple-verifier`.
Use an approved private Node 22+ runtime; FTP-only PHP hosting cannot run this service.
An operator must confirm the existing runtime, or provision it if absent, using the
settings in [SUBSCRIPTIONS.md](SUBSCRIPTIONS.md#separate-private-verifier-runtime).

From the verifier service directory on that private runtime:

```sh
npm ci --omit=dev
npm start
```

Supply settings through the runtime's private secret/environment management, not
source-controlled files, public folders, shell history or PR comments:

- `APPLE_BUNDLE_ID=com.modelglue.Blobular`
- `APPLE_PRODUCT_IDS=com.thinknoise.blobular.cloud.monthly`
- `APPLE_ENVIRONMENT=Production` or an isolated `Sandbox` instance
- `APPLE_APP_ID`: actual numeric App Store app ID (required for Production)
- `APPLE_ISSUER_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY_FILE`: real In-App Purchase
  API key metadata and a private readable `.p8` file
- `APPLE_ROOT_CA_FILES`: private paths to trusted Apple root certificates
- `VERIFIER_SECRET`: private shared secret of at least 32 characters

Keep the service on loopback behind private authenticated HTTPS. Preserve TLS
verification and suppress request bodies/authorization headers in proxy logs.
PHP host-managed settings must match: `apple_product_ids`, `apple_environment`,
`apple_verifier_url`, `apple_verifier_secret`. Do not print their secret values.
The public Apple notification URL, once deployed, is
`https://modelglue.com/blobular/api/app-store-notifications.php`; configure
Notifications V2 in App Store Connect for the intended environment.

The current implementation selects one server-owned Apple environment per instance;
it does not retry Production transactions against Sandbox automatically. Do not
point a mixed-environment release at one environment and claim both are supported.
Confirm an isolated Sandbox backend/verifier path for TestFlight/App Review and a
Production path for live billing; if one shared endpoint must support both, that
requires an explicitly reviewed routing change before submission. Never accept a
client entitlement/environment flag as verification.

After an authorized rollout, exercise a genuine Sandbox purchase and restore,
renewal, cancellation, expiry, refund/revocation and notification delivery. Confirm
wrong-account restores fail and existing owned audio stays readable after expiry.
Local StoreKitTest and mocked SDK fixtures do not prove Apple's live verifier works.
Retain the test results without credentials or signed transaction payloads.

Do not change `cloud_authorization_mode` or `cloud_test_account_ids` in this task.
Native requires `entitlements` mode for new subscription-backed saves/purchases;
any transition from the existing restricted mode needs a separate approved rollout
following genuine verification. A complimentary row alone does not broaden uploads.

## Legal publication and Native links

Privacy and Terms HTML/build entries already exist. Their technical descriptions
now match the merged Native temporary-workspace/Local-save behavior. They remain
explicit drafts with `noindex`; do not remove those markers without the owner facts
and approval listed in [LEGAL_REVIEW.md](LEGAL_REVIEW.md).

The owner must provide the operator name/contact address, actual retention and
provider/backup practices, account-deletion process/timeframe, final offer/Apple
standard-EULA selection and effective date. In-app account-deletion initiation is
required if the shipping app supports account creation; a support email alone does
not provide this capability. Verify the actual release flow rather than assuming
that the existence of a backend create-user endpoint settles Native behavior.

Once approved, finalize the text/date and authorize deployment through the existing
manual **Deploy Blobular** workflow. After deployment, verify both final pages are
public HTTPS pages, then set these generated Native Info.plist keys in Debug and Release:

- `BlobularPrivacyPolicyURL=https://modelglue.com/blobular/privacy/`
- `BlobularTermsOfUseURL=https://modelglue.com/blobular/terms/`

Merged Native code intentionally disables Subscribe until both URLs are configured.
Use the finalized paywall for the App Store review screenshot.

## Deployment evidence and limits

The latest successful recorded Deploy Blobular workflow reviewed was run
`45949871999`, commit `d53c6f5`, before subscription/legal merges. Merges alone do not
deploy. Public URL checks from this environment returned HTTP 465, which does not
establish the origin pages' status. The operator must verify publication directly.
No credentials, production data, deployment workflow or production settings changed.

## Repository validation for this update

Passed: 46 SQLite entitlement checks, six subscription/admin HTTP tests, six Apple
verifier tests, eight deployment/configuration checks, production web build, built
legal-page links/assets, documentation links and diff checks. HTTP fixtures were
rerun with permitted localhost binding after sandbox port restrictions blocked the
initial attempt. No production database, Apple billing, migration or grant ran.
The new read-only SQL was source-reviewed, not executed against production.
