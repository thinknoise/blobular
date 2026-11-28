# Account deletion requests — Blobular 1.0

## User flow and API

Settings → Delete Account explains Cloud, Local and Apple billing effects, requires
the current password, then a separate confirmation. Manage Subscription opens
Apple's native controls; cancelling Apple renewal is independent of deletion.

`GET /api/account-deletion.php` requires the existing bearer session and returns
`{ok:true,userId,request:null}` or a request `{id,status:"requested",requestedAt}`.
GET records nothing. POST accepts exactly `currentPassword` and
`confirmation:"DELETE ACCOUNT"`, with no supplied account ID or email.

POST re-verifies the password under the account row lock, then locks/rechecks the
session's owner, expiry and revocation before recording a request in the existing
migration 003 `<users>_ent_log` table. The action is `request-account-deletion`, the
actor is `account:<ID>`, and the reason records confirmation/password verification,
never the password or token. User-first locking matches existing password/grant
operations. Repeated submissions return the same receipt without duplicate audits.
An audit failure rolls back and returns 503. No new table or migration is required.
No user, recording, subscription or upload-policy row is deleted or changed.

A receipt means **pending request**, not completed erasure or cancelled Apple billing.
Missing endpoint/schema, expired login or failed authentication must not show success.
The Native app does not persist the password or receipt; GET recovers the receipt
on reopening, including after an ambiguous network failure.

## Manual operator procedure

Responsible operator: **Wiley Evans**, using **blobular@modelglue.com**.
Acknowledge within **7 calendar days**; complete verified requests within
**30 calendar days**, subject to legally required retention or documented exceptions.

1. Review pending requests through authenticated production phpMyAdmin or an existing
   private DB session using the read-only query below. Regularly monitor the queue
   so the acknowledgement deadline is met. Do not wait for the user to email support.
2. Identify the existing account from the recorded user ID and current email. The
   request was authenticated and password-verified by the service; investigate any
   ownership anomaly without asking for passwords. Record acknowledgement, operator,
   dates, target completion date and any exception privately in the existing support
   workflow. Notify the account email through blobular@modelglue.com.
3. Inventory the account, sessions, owned Cloud recordings (including incomplete
   uploads and failed deletions), any account-associated legacy Web storage, and
   billing/audit bindings. Separate necessary retained billing/audit records from
   personal data that must be erased. Local copies on users' devices remain intact.
4. Carry out account/Cloud erasure only through a separately reviewed procedure.
   The current backend has per-recording Cloud deletion, but no reviewed whole-account
   erasure operation. Owner foreign keys and retained Apple ownership bindings mean
   a blind `DELETE FROM users` is unsafe. Do not disable foreign keys, remove purchase
   binding protection, improvise SQL deletion, or claim a queued request is complete.
5. Until erasure is actually verified, keep the request pending. Document any lawful
   retention/processing exception and explain it to the user. Do not silently close
   the request because 30 days elapsed or because Apple billing was cancelled.
6. After actual erasure, verify account access/session removal and Cloud-object
   removal, documenting any required retained records and exceptions. Send a completion
   confirmation from blobular@modelglue.com. Preserve only necessary audit evidence;
   do not claim a backup retention guarantee or erase Local/device files remotely.

Read-only request queue (no status/grant/production writes):

```sql
SELECT a.id AS request_id, a.user_id, u.username AS account_email,
       a.recorded_at AS requested_at_unix, a.actor, a.reason
FROM modelglue_user.blobular_users_ent_log AS a
JOIN modelglue_user.blobular_users AS u ON u.id = a.user_id
WHERE a.action = 'request-account-deletion'
ORDER BY a.recorded_at, a.id;
```

This query lists recorded requests, not a new automated erasure/closure mechanism.
Correlate with the private support record; do not mark a request fulfilled in support
until deletion is actually complete. No automatic emails or job scheduler are added.

## Release review

The endpoint and UI implement initiation only, and the public policy explains manual
processing. A reviewed account-erasure procedure must be in place to fulfil real
requests before shipping. This task explicitly does not implement an unreviewed
mechanism. No production data, paid-subscription mode or upload allowlist changes.

Apple permits manual processing but requires clear timing and completion confirmation:
[account deletion guidance](https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion).

## Validation in this increment

Passed six deletion-request HTTP tests, nine focused checks on each of disposable
MySQL 5.7.44 and 8.4, 46 existing entitlement checks, six existing subscription HTTP
tests, 21 authentication/configuration regressions, eight deployment checks, the
production Web build, PHP syntax, built legal/support content/links, and diff checks.
All backend fixtures are disposable; no production configuration or data was read or
modified. No migration, production request, email, deployment or erasure ran.
