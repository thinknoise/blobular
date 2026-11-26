# Blobular Cloud Audio Library API

Backend API shared by future Web and Native clients. The existing Web frontend
and direct-S3 library are unchanged. Cloud saving remains restricted to dedicated
test accounts until subscription enforcement is implemented.

## Runtime and server configuration

Reuse the PHP/MySQL account configuration in `public/api/README.md`. Requires
64-bit PHP 8+, PDO MySQL, cURL, SimpleXML/libxml, and HTTPS. No new packages or
Composer dependency are introduced. S3 Signature V4 signing uses PHP's native
hash functions and is tested against AWS's published query-signing vector.

Provide these **server-only settings**, never Vite variables, browser
configuration, tracked files, or a public PHP response:

- `BLOBULAR_S3_ACCESS_KEY_ID`
- `BLOBULAR_S3_SECRET_ACCESS_KEY`
- `BLOBULAR_S3_SESSION_TOKEN` when using temporary credentials (optional otherwise)

### Host-managed configuration and restricted testing

Keep credentials in the existing **production** `config.php` beside `login-user.php`,
`_bootstrap.php`, and `_s3.php`: the deployed `/blobular/api/config.php` filesystem
location (relative to the hosting site's document root). Do not replace the whole
file or remove its existing database settings. Add these entries inside its
existing returned array:

```php
'cloud_test_account_ids' => '6',
's3_access_key_id' => 'YOUR_BLOBULAR_CLOUD_ACCESS_KEY_ID',
's3_secret_access_key' => 'YOUR_BLOBULAR_CLOUD_SECRET_ACCESS_KEY',
's3_session_token' => '', // Permanent IAM keys do not need a session token.
```

These correspond to `BLOBULAR_CLOUD_TEST_ACCOUNT_IDS`,
`BLOBULAR_S3_ACCESS_KEY_ID`, `BLOBULAR_S3_SECRET_ACCESS_KEY`, and optional
`BLOBULAR_S3_SESSION_TOKEN`. File values take precedence, including explicit empty
strings, matching the database configuration convention. Environment variables
are fallback values only for keys absent from the file. No bucket/region setting
is required. Temporary STS credentials also need their token and external refresh.

Only account **6** may create or complete uploads with the configuration above.
Absent, empty, or malformed allowlists deny writes; there is no hardcoded account
fallback. Listing, downloading, and deletion retain authentication and ownership
checks. Removing an ID prevents completion but cannot revoke a previously issued
five-minute staging PUT URL; hidden abandoned bytes need the existing cleanup.
This restriction does not change legacy Web uploads or implement subscriptions.

For local development the corresponding file is `public/api/config.php` in this
Web checkout. Git ignores that file and common backup/editor copies. Never put
real credentials in `config.example.php`, Vite settings, a commit, or a PR.
Use the hosting file manager or authorized encrypted transfer to edit the server
file; keep permissions limited to the hosting account/PHP service. No credentials
or allowlist need to be placed in GitHub Actions secrets.

The workflow no longer generates `config.php` or reads database/S3 secrets. The build
filters local config, common backup copies, API documentation and examples before
copying public assets. The workflow also removes config copies from `dist/api` after building,
and excludes them from both publish **and deletion** during FTPS synchronization.
`dangerous-clean-slate` remains false. The existing host file, including its DB
settings, is preserved even if an earlier deployment tracked it. Existing `FTP_*`
connection secrets remain necessary. No migration runs in this workflow.

`public/api/.htaccess` denies HTTP access to `config.php` and common backups,
including when PHP execution is unavailable. It does not prevent PHP includes.
The production Apache-compatible host must honor `.htaccess` with `AllowOverride
AuthConfig` (or equivalent). After a reviewed deployment, confirm direct requests
return **403** and the existing APIs still work. If the host ignores `.htaccess`,
configure the equivalent HTTP deny rule in its control panel before adding keys;
PHP's empty response alone is not an HTTP access restriction. Host behavior cannot
be verified by local tests and was not modified for this PR.

Deployment remains **manual only** and requires explicit FTPS with trusted
certificate validation (`protocol: ftps`, `security: strict`). Confirm FTPS support
and the certificate matching `FTP_SERVER` before deployment; do not fall back to
plaintext or loose validation. See the [transfer action's exclusion and TLS options](https://github.com/SamKirkland/FTP-Deploy-Action/tree/v4.3.5).

The host is fixed to `blobular-audio.s3.us-east-2.amazonaws.com`, reusing the
existing bucket/region. There is no user-controlled endpoint, bucket, prefix,
owner, ACL, object key, or visibility. Refresh temporary credentials externally;
there is no role-discovery/refresh service in this increment. A URL can expire
before its five-minute limit if the signing credentials expire first.

Use a dedicated backend principal limited to the new `cloud-library/*` prefix.
Its IAM policy needs `s3:PutObject` (including CopyObject destination),
`s3:GetObject` (GET/HEAD and copy source), and `s3:DeleteObject`, scoped to
`arn:aws:s3:::blobular-audio/cloud-library/*`. Listing
uses MySQL; the API does not require bucket-wide ListBucket. Applicable SSE-KMS
keys may also require decrypt/generate-data-key access for checksums and copy.
No permissions, keys, CORS, lifecycle rules, bucket settings, or data were changed.

Without ListBucket, S3 can report a missing staging object as HEAD 403. Completion
treats that ambiguous staging response as retryable 409 and leaves it hidden. It
cannot distinguish an unfinished PUT from denied read access; persistent 409 after
a successful PUT requires checking backend object permissions. Other storage
failures, including a denied HEAD on the saved copy, remain 503.

**Production prerequisite:** audit existing browser Cognito identity-pool IAM,
bucket policy, ACLs, and public-access settings. Its old direct-S3 credentials
must not grant access to `cloud-library/*`. API ownership checks cannot protect
objects from a separate overprivileged AWS principal. Keep the old web app's
`audio-pond/*` behavior while restricting the new prefix separately. Validate
CORS for the intended clients, PUT headers below, and allowed browser origins.
These production changes require a separate, explicit infrastructure task.

## Migrations (manual only)

Apply `001-cloud-foundation.sql` first, then review
[002-cloud-audio-lifecycle.sql](migrations/002-cloud-audio-lifecycle.sql), replacing
`blobular_users` throughout with the actual account-table prefix. Migration 002
adds upload state, staging key, expected checksum, upload expiry, cleanup deadline,
and owner/state/ID plus cleanup indexes to the existing metadata table.

DDL auto-commits; take backups and inspect a partial migration before resuming.
Do not enable the endpoints until both schemas and server credentials are ready.
There are no automatic migration hooks or scheduled cleanup jobs. Existing
rows are not backfilled, moved, inferred from S3 keys, or automatically exposed.
A future migration must verify actual legacy ownership and bytes first.

A code rollback must precede removing lifecycle columns. Back up metadata and
preserve staging/saved keys and tombstones needed for cleanup. Dropping these
columns or tables does not remove S3 objects and would lose cleanup/ownership
information. New indexes fit the existing foundation's MySQL 8/InnoDB
requirements; verify production version/schema/page size and grants separately.

## Endpoints

All paths are relative to `/blobular/api/`. Every operation requires
`Authorization: Bearer <sessionToken>` from the existing PHP login. The server
resolves identity from the validated session; `userId`, ownership, key, and
visibility fields in client input never select an account or object.

| Request | Behavior |
| --- | --- |
| `GET sounds.php` | Own **ready** recordings, at most 50, ordered by UUID ascending. Returns `{ok,sounds,nextCursor}`. |
| `GET sounds.php?after=<nextCursor>` | Continue the same UUID ordering; concurrent additions/deletions need a refresh for a complete new snapshot. |
| `POST sounds.php` | Create a private upload intent and return `{ok,id,state:"uploading",upload:{method,url,headers},expiresAt}`; does not publish metadata yet. |
| `POST sound.php?id=<id>` | Verify upload, copy to saved storage, verify saved copy, atomically mark ready. Returns `{ok,sound}`. Completion retries return the same recording. |
| `GET sound.php?id=<id>` | Only for an owned ready recording. Returns `{ok,sound,download:{method:"GET",url},expiresAt}`. No redirect or audio bytes pass through PHP. |
| `DELETE sound.php?id=<id>` | Durably hide the recording, delete saved and staging objects, retain a tombstone. Returns `{ok:true}`; retry after a transient error. |

Upload-intent body (JSON):

```json
{
  "filename": "field-recording.wav",
  "title": "Evening birds",
  "mimeType": "audio/wav",
  "byteSize": 102400,
  "checksumSha256": "<64 lowercase hexadecimal characters>",
  "kind": "recording"
}
```

`title` defaults to `filename`; `kind` defaults to `upload`. Size must be an
integer from 1 through **536870912 bytes (512 MiB)**. Single PUT only; no multipart
upload/resume protocol is added. Allowed MIME values: `audio/wav`, `audio/x-wav`,
`audio/aiff`, `audio/x-aiff`, `audio/mpeg`, `audio/ogg`, `audio/flac`, `audio/aac`,
`audio/mp4`. Names/titles are at most 255 UTF-8 bytes with no control characters.
Metadata requests are capped at 16 KiB (413 when exceeded).
Clients should treat displayed names as text. Filenames never form object keys.
Optional analysis columns in the existing schema stay NULL; the server does not
decode audio, certify the actual format, or trust client duration/channel counts.

Saved metadata contains `id,title,filename,mimeType,byteSize,checksumSha256,kind,
createdAt`. Pending, deleting, deleted, and expired records never appear in the
list and cannot receive download URLs. Other users and nonexistent IDs both
return the same 404. Invalid input returns 400; unsupported method 405; unfinished
or mismatched upload / wrong lifecycle state 409; expired completion window 410;
storage/configuration failure 503; database/unexpected failure 500. Errors expose
no database, AWS response, URL, secret, or filesystem details. Responses are
`Cache-Control: no-store` via the existing API bootstrap.

## Transfer and integrity protocol

1. Compute the full file's SHA-256 before requesting an intent. Stream/hash large
   files on the client rather than decoding them wholly for this purpose.
2. POST metadata. The response's PUT URL expires after **300 seconds** and writes
   only `cloud-library/staging/{validatedOwnerId}/{serverUUID}`. Start a binary PUT
   with every returned header. `content-length`, `content-type`, and
   `x-amz-checksum-sha256` are signed. A browser sets Content-Length itself from
   the Blob; its exact byte count must match. Never send the PHP session token to
   S3. Do not log or persist transfer URLs as library identifiers.
3. After a successful PUT, POST completion. S3 enforces the signed SHA-256 checksum;
   PHP HEADs the object with checksum retrieval enabled and checks exact size,
   MIME, and SHA-256. It copies the inspected ETag to
   `cloud-library/saved/{owner}/{id}`, then HEAD-verifies that saved copy before
   publishing the metadata. CopyObject's possible HTTP-200 embedded Error is
   treated as failure. No AWS ACL/public-read option is sent.
4. A staging URL may be reused until expiry, but only for the same size/MIME/hash.
   It can never write the saved key. After completion, retries do not recopy or
   replace a saved recording. Completion is allowed until 24 hours after the
   original upload URL expiry, accommodating a transfer started near expiry.
5. To play/download, request a new 300-second GET URL. Downloads are forced to
   attachment/application-octet-stream with private/no-store response caching.
   Session logout/revocation prevents *new* capabilities; an already issued URL
   remains a bearer capability until expiry or object deletion. Redact URL query
   strings, session headers, credentials, and bodies containing URLs from logs.

The PHP server never buffers an audio file. It makes bounded HEAD/Copy/Delete
requests with TLS verification, no redirect following, 5-second connection and
30-second operation timeouts, and at most 64 KiB of response XML. Files that fail
MIME/size/checksum verification remain unpublished and can be cancelled or cleaned.
This validates integrity, not that arbitrary bytes are actually playable audio.

## Interruption, deletion, and cleanup

MySQL row locks serialize completion against deletion and cleanup. Network I/O
is outside audio/UI execution; here it holds one metadata row lock during
completion/cleanup. Completion can make three 30-second storage requests, so
configure the eventual host request timeout accordingly; competing operations
on that recording may hit the MySQL lock timeout and need a retry. Other recordings/accounts do not share that lock. A failed
copy or a DB failure after copy leaves a hidden `uploading` row; completion is
retryable. Copies with uncertain outcomes use a deterministic, server-only saved
key and are removed if the intent expires.

Deletion first commits `deleting`, preventing new downloads/completion even if
S3 is unavailable. A failed deletion stays hidden and can be retried. Successful
deletion becomes `deleted`. This is current-object deletion; existing bucket
versioning/retention may retain historical versions. No version purge is attempted.

Manual maintenance command (no scheduler is installed):

```sh
php scripts/cleanup-cloud-audio.php          # read-only preview, up to 100 candidates
php scripts/cleanup-cloud-audio.php --apply  # explicitly remove objects and update lifecycle rows
```

Use the same server configuration. Do not run against production without its
separate approval. Deploy an explicit maintenance schedule in a later operations
task; repeat batches and monitor the failure count/backlog. Each applied pass:

- Removes staging data once the completion window has elapsed.
- Removes saved data for expired/cancelled/deleting records; retries failures.
- Preserves ready saved data and all ownership/lifecycle tombstones.
- Revisits tombstones daily, because a PUT started before expiry or a timed-out
  copy may finish after an earlier cleanup. Cleanup cannot assume URL expiry
  immediately terminates an in-flight S3 operation.

Until cleanup is operated, abandoned objects remain private but may consume
storage. A carefully scoped staging-prefix lifecycle rule can provide a second
retention bound in a separately approved infrastructure task. No automatic cleanup
job or production lifecycle rule is created here. Do not purge tombstones without
an operations plan that also accounts for late transfers.

## Local verification

```sh
python3 tests/backend/cloud_config.py
python3 tests/backend/run.py
python3 tests/backend/sounds_http.py
php tests/backend/sounds.php
python3 tests/backend/mysql.py
```

HTTP tests use disposable SQLite/session fixtures and a local fake object store.
The shared audio tests run against SQLite and both cached MySQL 8.0/8.4 containers;
MySQL applies the real migrations locally. Tests cover missing/expired auth,
owner isolation, ignored forged ownership/keys, lifecycle visibility, malformed
metadata, integrity mismatches, storage errors, a DB failure after copy, completion
and deletion retries, late-object cleanup, pagination, and signing/error parsing.
No test uses actual credentials, contacts AWS, or applies a production migration.

Still needs an isolated staging-account end-to-end PUT/HEAD/copy/GET/delete test,
production IAM/CORS/encryption/retention review, credentials rotation checks,
real-host PHP/Authorization/TLS checks, and operational cleanup setup. The existing
web direct-S3 path is not migrated and remains a separate security boundary.

## AWS references

- [SigV4 query authentication and published test vector](https://docs.aws.amazon.com/AmazonS3/latest/API/sigv4-query-string-auth.html)
- [Presigned URLs, checksums, and expiry](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html)
- [CopyObject conditions and embedded errors](https://docs.aws.amazon.com/AmazonS3/latest/API/API_CopyObject.html)
