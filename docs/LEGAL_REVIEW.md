# Privacy and Terms publication review

Draft prepared November 26, 2026 from Web main `36a01b9` and read-only inspection
of Native main. These pages are deliberately marked **Draft for review**, have no
effective date and use `noindex`. Do not present them as final legal policies or
submit them as finalized App Store disclosures until the issues below are resolved.
No deployment, production inspection, account operation or API change was performed.

## Owner confirmations required

- [ ] **Legal operator:** full person/company name and required contact address,
  plus any applicable jurisdiction-specific disclosures. No company, street
  address, governing law, arbitration clause or liability cap has been invented.
- [x] **Contact:** owner confirmed `wiley@thinknoise.com` for privacy/support/account
  deletion requests. The earlier support page uses the same address.
- [ ] **Retention:** specify actual retention and reasons for accounts, expired or
  revoked sessions, deleted-record metadata, subscription/audit records and support
  messages. The code has no fixed purge policy for these. Do not turn upload cleanup
  eligibility into a guarantee about cleanup scheduling.
- [ ] **Backups and providers:** confirm hosting/mail provider identity and relevant
  server, AWS, proxy and mail logging; backup retention, S3 versioning/lifecycle,
  regions/international transfers, access and deletion handling. Source inspection
  cannot establish those production operations. No live settings were inspected.
- [ ] **Account deletion:** establish ownership verification, who processes requests,
  how users initiate deletion, completion timeframe/confirmation, and which account,
  session, audio, billing and audit records are erased or retained and why. Current
  foreign keys prevent deleting a user without reconciling associated data.
- [ ] **App Store deletion flow:** confirm the release's account-creation behavior
  and implement the required in-app initiation route in a separate scoped task.
  Apple generally does not permit an email-only support flow for ordinary apps
  that support account creation. A policy page or mailto link does not implement it.
- [ ] **Subscriptions:** confirm release availability, the final $4.99/month offer,
  App Store Connect product/currency/territories, Apple standard-EULA selection,
  entitlement rollout and Native StoreKit wiring. PR #23 is merged but did not
  activate purchases or broaden production upload access. Draft billing statements
  are conditional and use Apple's purchase confirmation as the price source.
- [ ] **Final legal scope:** review ownership/service permissions, acceptable use,
  any required age/children's disclosures and regional rights, and ensure final
  App Store privacy answers match the shipping app and actual provider practices.
  No claims of regulatory compliance, no tracking, no data sales, zero telemetry,
  fixed response deadlines or complete immediate erasure have been inferred from
  absence of source code.
- [ ] **Publication:** confirm the final policy text and effective date, remove the
  draft notices/`noindex`, update the pages' dates, and deploy only after approval.

## Evidence for the draft

| Area | Inspected source | What it establishes |
| --- | --- | --- |
| Account creation | `public/api/create-user.php`, `_bootstrap.php` | Email/username, numeric ID, creation timestamp and bcrypt password hash; no account-delete endpoint among runtime handlers. |
| Sessions | `public/api/_sessions.php`, `infra/migrations/001-cloud-foundation.sql` | Hashed bearer tokens, owner/creation/expiry/revocation; expiry denies access without necessarily deleting rows. |
| Web remembered account | `src/features/auth/utils/modelglueAuthStore.ts` | Session storage and optional local-storage remembered identity; this Web code discards the Cloud bearer token. |
| Legacy Web audio | `src/features/sounds/api/soundLibraryClient.ts`, `legacyS3SoundLibraryClient.ts`, `utils/soundMetadata.ts`, `src/shared/utils/aws/awsS3Helpers.ts`, `awsConfig.ts` | Direct AWS S3/Cognito integration, shared/public collection and user-related paths; UI visibility/folder labels are not evidence of authenticated-API authorization. No claim that all Web audio is confidential. |
| Web save controls | `src/features/audioMenu/components/AudioPondMenu.tsx`, `AudioPond/RecordedItem.tsx`, `context/AudioPondProvider.tsx` | Explicit Web save/upload actions use that legacy integration, separate from iPhone Local storage. |
| Authenticated Cloud | `public/api/_sounds.php`, `_s3.php`, migrations 001/002 | Owner-scoped listing/transfers/deletion; S3 objects, filenames/titles/size/checksum/state; short-lived transfer capabilities. |
| Cloud deletion/retention | `_sounds.php` `delete()` / `cleanup()`, `scripts/cleanup-cloud-audio.php` | Hide before S3 removal; failures may require retry; deleted metadata is retained/revisited; tools do not prove a production cleanup schedule. |
| Subscriptions | `_entitlements.php`, migration 003, `services/apple-verifier/verification.mjs`, `docs/SUBSCRIPTIONS.md` | Verified Apple transaction/account binding, expiry/renewal/revocation, event digests and administrative audit; subscription loss preserves owned list/download/delete. Actual Apple activation is separate. |
| Native Local library | Native `Blobular/AudioLibrary.swift` | App-container audio, metadata and waveform files; imported source copied; local removal removes that library directory. |
| Native Cloud | Native `Blobular/BlobularCloudClient.swift`, `CloudSessionStore.swift`, `docs/CLOUD.md` | Keychain session, no persisted password/transfer URLs in session store, explicit Cloud actions, Local/Cloud deletion separation. Current docs say no automatic sync or StoreKit subscription flow. |
| Website font | `src/index.css` | External `fonts.googleapis.com` CSS request. No change to the established font in this PR. |
| Support | `support/index.html` and owner confirmation | Existing support email and visual design. |

These describe inspected code and do not establish host logs, backups or the exact
version currently running in every production component. Native is read only.

## Official references checked

- [Apple standard EULA](https://www.apple.com/legal/internet-services/itunes/dev/stdeula/)
  supplies the app software license; no competing custom software license is drafted.
- [Apple subscription cancellation](https://support.apple.com/en-us/118428)
  and [subscription settings](https://apps.apple.com/account/subscriptions/).
- [Apple account deletion guidance](https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion)
  requires in-app initiation for account-creating apps and explains billing separation.
- [Apple privacy policy](https://www.apple.com/legal/privacy/) and
  [Google Fonts FAQ](https://fonts.google.com/faq) are linked for third-party services.

## Delivery

Vite has explicit static HTML entries for `/blobular/privacy/` and `/blobular/terms/`.
They share the support styles and require no login, application JS, session or API
request. Support links to both; each legal page links to support and the other page.
A small additional stylesheet only handles legal text width/spacing/navigation wrap.
The deployment workflow, PHP API and configuration remain unchanged. The existing
manual Deploy Blobular workflow will include these pages and their hashed CSS
assets from `dist` after this PR is merged and a deployment is separately authorized.
