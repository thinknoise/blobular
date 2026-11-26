# Blobular Cloud backend foundation

The additive [Cloud Audio Library API](../../infra/CLOUD_AUDIO_API.md) now implements
owned audio operations separately from the existing web client. Its lifecycle
migration and server-only storage configuration require separate setup.

PHP/MySQL accounts remain authoritative. Existing numeric IDs and bcrypt hashes
are preserved. No production AWS resources, objects, or IAM policies were changed. Audio
operations are implemented separately in the linked API; subscriptions remain out
of scope.

## Contract

All endpoints are under `/blobular/api/`, accept/return JSON, and require HTTPS
in deployment. Responses use `Cache-Control: no-store`. Do not log passwords,
Authorization headers, or response bodies containing tokens.

| Endpoint | Method | Authentication and response |
| --- | --- | --- |
| `login-user.php` | POST | `{email,password}`. Existing `ok`, `message`, `userId`, `createdAt` fields retained. Adds `sessionToken`, `tokenType: "Bearer"`, and `expiresAt` (Unix seconds). |
| `me.php` or `me/` | GET | `Authorization: Bearer <sessionToken>`. Returns `{ok,user:{id,email,createdAt},expiresAt}`. |
| `logout.php` or `logout/` | POST | Same bearer header. Revokes only the presented session. Returns `{ok,message}`. |
| `create-user.php` | POST | Existing registration behavior unchanged; does not issue a session. A new client must log in after registration. |
| `reset-password.php` | POST | Existing `{email,currentPassword,newPassword}` password-change contract retained. Now atomically revokes all of that account's sessions. This is not forgotten-password recovery. |

Directory routes use standard PHP `index.php` handling; hosts may redirect
`/me` to `/me/` and `/logout` to `/logout/`. Prefer `.php` URLs for clients that
must avoid redirects. Verify routing and Authorization header forwarding on the
actual PHP host. No Apache rewrite module is required.

Tokens have 256 bits of randomness. Only SHA-256 token hashes are stored in the
session table. Expiry is absolute and server-checked on every authenticated
request. There is no refresh token, sliding expiry, cookie authentication, or
client-controlled lifetime. Missing, malformed, unknown, expired, revoked, and
orphaned sessions return 401. Repeated logout returns 401 after the first
revocation. Database failures return 500 without database details and never
fall back to browser identity. Client-supplied user IDs are not authorization.

Login locks the account row while verifying its password and creating its
session. Password changes lock the same row, update the bcrypt hash, and revoke
sessions in one transaction; failure rolls back both changes. This prevents an
old-password login from issuing a session after password-change revocation.

## Existing web compatibility

The React frontend is deliberately unchanged. It still uses browser-stored user
JSON and its existing local-only logout; it ignores the new login token fields.
Registration continues to work as before. Existing browser sessions are NOT
upgraded into authenticated backend sessions. A future client task must retain
the issued credential securely, use `/me`, and call server logout. Never accept
its browser-stored ID as proof of account ownership in a cloud API.

## Configuration and migrations (manual; not applied)

Requires PHP 8+, PDO MySQL, and MySQL 8/InnoDB with an InnoDB page size
of at least 8 KiB. The migration explicitly selects DYNAMIC row format. Keep `config.php` server-only,
ignored by Git, and out of mobile/static distributions. No AWS credentials are
needed by the authentication endpoints; audio uses separate server environment
credentials as described in the linked API.

Existing configuration keys/environment variables remain:

- `db_host` / `BLOBULAR_DB_HOST`
- `db_name` / `BLOBULAR_DB_NAME`
- `db_user` / `BLOBULAR_DB_USER`
- `db_pass` / `BLOBULAR_DB_PASS`
- `users_table` / `BLOBULAR_USERS_TABLE` (fallback: `app_users`)
- New: `session_ttl_seconds` / `BLOBULAR_SESSION_TTL_SECONDS` (default: 3600;
  integer 60–172800). `config.php` values take precedence over environment.

Sessions use `<users_table>_sessions`; future sounds use `<users_table>_sounds`.
Account table names must be alphanumeric/underscore and at most 55 characters.

Before any future deployment:

1. Verify the production users-table name, schema, engine, and ID type; take a
   backup. Read-only preflight: `SELECT VERSION(), @@innodb_page_size,
   @@innodb_default_row_format`; inspect `SHOW CREATE TABLE` and `SHOW INDEX`
   for the configured users table. Confirm its unique username index as well
   as its unsigned primary key. Production version/settings were unavailable
   during local review; tests on 8.0/8.4 do not establish production compatibility.
   Local ignored configuration selects `blobular_users`, while the API
   fallback is `app_users`. Do not infer production settings from either.
2. Review [001-cloud-foundation.sql](../../infra/migrations/001-cloud-foundation.sql).
   Replace **every** `blobular_users` occurrence with the actual users-table
   name, including table-name prefixes. The existing table must have InnoDB and
   `id INT UNSIGNED PRIMARY KEY`. The migration does not alter that table.
3. Apply the reviewed SQL once with a migration account, to the configured DB.
   MySQL DDL auto-commits; this is not an atomic migration. If interrupted,
   inspect which tables exist before resuming. Do not blindly reapply or drop
   tables containing data. No automatic migration runs in the new endpoints.
   The composite sound-object index needs 1,087 bytes; COMPACT's 767-byte limit
   and 4 KiB InnoDB pages cannot support it. Explicit DYNAMIC handles a COMPACT
   server default, but cannot compensate for a 4 KiB page-size configuration.
4. The runtime account needs SELECT on users/sessions, INSERT on sessions,
   UPDATE on sessions/passwords, and existing registration permissions. The
   old account endpoints still call `CREATE TABLE IF NOT EXISTS` for users;
   this existing behavior may require CREATE permission. Removing runtime DDL
   is a separate migration-hardening task.
5. Configure TLS, Authorization-header forwarding, clock synchronization, and
   redaction of credentials/tokens in server logs. Require encrypted DB
   transport when the DB connection traverses an untrusted network.
6. Smoke-test login, `/me`, logout, expiry, and password-change revocation on an
   isolated MySQL staging environment before enabling clients.

The migration creates sound metadata with a required owner foreign key, unique
bucket/object key, original filename, size/type, optional audio properties, and
private-by-default visibility. Account deletion is restricted while sound rows
exist so a future deletion flow must handle S3 objects explicitly. IDs and
storage keys must be generated by the future server API. Nothing imports legacy
S3 objects or infers ownership from their prefixes. The audio endpoints require
the additional lifecycle migration and storage configuration described above.

Rollback is a coordinated code/schema operation, not SQL `ROLLBACK`: restore
all previous PHP files together before considering removal of the session table,
or the new login/password-change code will fail closed. Back up new tables first.
Only remove fixture/unused new tables after confirming their contents; dropping
sound metadata with stored objects would lose ownership records. Existing user
IDs and password hashes are never removed by this migration. Password changes
made after deployment cannot be undone by rolling back the schema.

Periodically delete session rows whose `expires_at` is in the past using a
separate maintenance job. Expiration/revocation works without that job; cleanup
only limits table growth. No cleanup job is installed by this task.

## Infrastructure findings and limits

- `src/shared/utils/aws/awsConfig.ts`: `blobular-audio`, `us-east-2`, browser-side
  Cognito identity-pool credentials independent of PHP login.
- `src/features/sounds/api/legacyS3SoundLibraryClient.ts` and
  `src/features/sounds/utils/soundMetadata.ts`: direct S3 operations;
  `audio-pond/users/{id}/{visibility}/...` ownership filtering is client-side.
  This foundation does not secure that existing storage path.
- `infra/cloudformation/blobular-auth-sounds.yaml`: old Cognito/API Gateway/
  DynamoDB concept; Lambda IAM includes bucket-wide read/write/delete and list.
  `infra/lambda/sounds/index.mjs` returns 501. These are not the new PHP backend
  or proof of any currently deployed permissions.
- `.github/workflows/deploy.yml`: builds Vite, generates `dist/api/config.php`
  from repository secrets, and deploys only when manually dispatched using
  **plain FTP**. The push-to-main trigger is removed in this PR; merging or
  pushing does not deploy, and no workflow applies migrations. It was not run. Before deployment, replace that transport with an
  encrypted option. Default TTL works with existing generated config; overriding
  it requires a server environment variable or future workflow configuration.
- Live IAM/identity-pool policies, bucket policy/ACL/CORS/encryption, deployed
  objects, production DB configuration, grants, TLS and PHP routing were not
  accessed or verified. No production connection or permission change was made.
- No login throttling, email verification, or forgotten-password recovery exists
  in these handlers. Review those protections before wider public access.

## Verification

Run `python3 tests/backend/run.py` from the repository root. Requires existing
PHP CLI (PDO SQLite) and Python 3; installs nothing. It runs real PHP endpoints
on localhost against a disposable SQLite DB with generated bcrypt fixtures.
It never loads real config.php or contacts the production DB/AWS.

The test copy substitutes only the PDO adapter/users-table provisioning and
removes `FOR UPDATE` from the password-change query. Production files are not
changed by testing. Tests cover login compatibility, wrong credentials, hashed
and distinct tokens, `/me` ownership, malformed/forged/query tokens, exact expiry,
logout scope, methods, password-change revocation/rollback, registration,
orphaned sessions, and fail-closed session-store errors. This SQLite suite does
not validate MySQL DDL, foreign keys or row locking; use the separate MySQL checks
below. TLS and deployment remain staging checks.

Run `python3 tests/backend/mysql.py` for MySQL-specific checks. Requires an already
running local Docker daemon, cached `mysql:8.0` and `mysql:8.4` images, and local
PHP PDO MySQL. It pulls nothing, starts disposable containers on random localhost
ports, and removes containers and their anonymous volumes afterward. It never
reads real config.php. Empty-password root access is confined to these temporary
fixtures; do not reuse their setup for a shared or production server.

The MySQL checks apply the actual migration under a COMPACT server default,
verify foreign keys, uniqueness, defaults and indexes, exercise session queries,
and confirm that an old-password login blocks on a concurrent password change
and is rejected after commit. They also check rollback and reapplication behavior.
The HTTP suite enables PHP error display and rejects malformed credential fields
without warnings; user-table setup failures and bcrypt-invalid input return
generic JSON errors.
Production PHP must still disable `display_errors` and log errors privately.

The existing registration conflict and password-change "User not found" responses
can reveal whether an email has an account. Those established contracts are
unchanged; the new `/me` and logout endpoints return no account data without a
valid session.

Session design reference: [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).
