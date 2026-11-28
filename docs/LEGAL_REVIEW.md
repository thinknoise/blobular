# Blobular 1.0 legal publication record

Owner-approved facts, November 27, 2026:

- Publisher/operator: **Wiley Evans, operating as Thinknoise**.
- Legal, privacy, support and account-deletion contact: **blobular@modelglue.com**.
- Privacy Policy and Terms effective date: **November 27, 2026**. Draft notices and
  `noindex` removed from both HTML pages.
- Accounts and saved recordings retained until user deletion or account deletion
  request processing, except necessary billing/audit retention. No fixed backup
  retention, immediate erasure or provider-log deletion guarantees are made.
- Subscription: **US $4.99/month**, auto-renewing, **no trial**; Apple's purchase
  confirmation supplies localized price/currency. Apple billing is managed separately.
- Wiley Evans manually processes account deletion requests: acknowledge within
  **7 calendar days**, complete verified requests within **30 calendar days**, subject
  to legally required retention or documented exceptions. Requests stay pending until
  actual erasure and the user receives confirmation.

The policy distinguishes app Local files, temporary experiment audio, authenticated
owned Cloud storage, and the legacy shared Web library. No automatic upload or
confidentiality guarantee is inferred for shared Web audio. Apple standard EULA
continues to supply the app software license; Terms cover the account/Cloud service.

## Account deletion implementation and operating boundary

Native Settings now initiates a request in-app with password verification and final
confirmation. The backend reuses existing bearer sessions, account locking and the
migration 003 audit table. It records a pending request, not erasure; repeated requests
return the existing receipt. See [ACCOUNT_DELETION.md](ACCOUNT_DELETION.md) for the
API and manual operator procedure. No unreviewed account-erasure mechanism is added.

Before shipping, Wiley must have a reviewed procedure capable of actually erasing
accounts and associated Cloud data within the stated time, while retaining only
necessary billing/audit evidence. Ownership foreign keys and immutable Apple purchase
bindings must be reconciled safely. This is an operational release dependency, not
permission to run destructive SQL, disable foreign keys or mark pending work complete.

## Publication checks

- Existing Vite entries produce public `/blobular/privacy/` and `/blobular/terms/`
  without application JS, authentication or API calls; support links use the new contact.
- Native Debug/Release configuration uses these final HTTPS URLs. The Web and Native
  PRs must be coordinated so users can reach the finalized pages and request endpoint.
- Deployment and App Store submission remain separately authorized actions. Review
  App Store privacy answers against the actual shipping app/provider practices.
- No production settings/data or upload restrictions change in this work.

Sources: existing Web/Native implementation, owner confirmations above,
[Apple standard EULA](https://www.apple.com/legal/internet-services/itunes/dev/stdeula/),
[Apple account deletion guidance](https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion),
[Apple subscription cancellation](https://support.apple.com/en-us/118428).
