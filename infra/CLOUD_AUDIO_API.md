# Blobular Cloud Audio Library API

Backend only, on branch `codex/blobular-cloud-audio-library` from merged PR #16.
The existing web UI, authentication contracts, direct-S3 library, and bundled
native instrument are unchanged. This API is not deployed or connected to a client.

## Runtime and server configuration

Reuse the PHP/MySQL account configuration in `public/api/README.md`. Requires
64-bit PHP 8+, PDO MySQL, cURL, SimpleXML/libxml, and HTTPS. No new packages or
Composer dependency are introduced. S3 Signature V4 signing uses PHP's native
hash functions and is tested against AWS's published query-signing vector.

Provide these **server environment variables**, never Vite variables, browser
configuration, tracked files, or a public PHP response:

- `BLOBULAR_S3_ACCESS_KEY_ID`
- `BLOBULAR_S3_SECRET_ACCESS_KEY`
- `BLOBULAR_S3_SESSION_TOKEN` when using temporary credentials (optional otherwise)

The host is fixed to `blobular-audio.s3.us-east-2.amazonaws.com`, reusing the
existing bucket/region. There is no user-controlled endpoint, bucket, prefix,
owner, ACL, object key, or visibility. Refresh temporary credentials externally;
there is no role-discovery/refresh service in this increment. A URL can expire
before its five-minute limit if the signing credentials expire first.

Use a dedicated backend principal limited to the new `cloud-library/*` prefix.
It needs object PUT (including CopyObject), GET/HEAD, and DELETE there. Listing
uses MySQL; the API does not require bucket-wide ListBucket. Applicable SSE-KMS
keys may also require decrypt/generate-data-key access for checksums and copy.
No permissions, keys, CORS, lifecycle rules, bucket settings, or data were changed.

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
There are no migration/deployment hooks, new jobs, or workflow changes. Existing
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
