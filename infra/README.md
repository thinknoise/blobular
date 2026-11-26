# Blobular Cloud backend

The shared PHP/MySQL/S3 backend is documented in [Cloud Audio Library API](CLOUD_AUDIO_API.md).
Authentication/session contracts are in [the PHP API README](../public/api/README.md).

- `migrations/001-cloud-foundation.sql`: sessions and owned sound metadata.
- `migrations/002-cloud-audio-lifecycle.sql`: staging, completion, deletion and cleanup state.
- `../public/api/sounds.php` and `../public/api/sound.php`: authenticated audio endpoints.
- `../scripts/cleanup-cloud-audio.php`: manual, dry-run-by-default maintenance.

Migrations are manual; nothing is deployed or scheduled by these files.
The existing React frontend still uses direct S3 access and browser-stored user
identity. It has not adopted this API and is not a secure account boundary for the
new prefix until production IAM/bucket settings have been separately verified.

## Older AWS scaffold

`cloudformation/blobular-auth-sounds.yaml` is the previous Cognito/API Gateway/
DynamoDB concept. `lambda/sounds/index.mjs` is its placeholder returning 501.
Neither is part of the PHP backend or evidence of deployed permissions. These
files remain unchanged; the PHP implementation reuses existing MySQL accounts.
