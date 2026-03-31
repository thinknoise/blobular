# Blobular Sound API Scaffold

Blobular now has the frontend seam for a real user-backed sound library:

- the app has an auth boundary
- new uploads are modeled as `SoundRecord`s instead of raw S3 keys
- user-scoped S3 prefixes are now possible without another UI rewrite

Account auth is no longer planned around Cognito on this branch. Blobular is
instead using the PHP + database flow under `public/api/`. The files in this
folder are kept only as a future option for a dedicated sounds API once
private/public sound enforcement moves server-side.

What is still missing is the real backend enforcement for sounds. The goal
state for that dedicated sounds layer is:

1. A server-side API enforces which sounds a caller can list, mutate, and download.
2. Sound metadata is stored outside raw S3 object keys.
3. S3 stays private and files are accessed with presigned URLs.

## Files

- `cloudformation/blobular-auth-sounds.yaml`
  Previous AWS-oriented concept for a dedicated sounds backend.
- `lambda/sounds/index.mjs`
  Placeholder handler entrypoint for the sounds API routes.

## Current limitation

The app still uses the temporary browser-side implementations:

- local browser session persistence after PHP login
- direct S3 access for sound listing and upload

That means the new user-scoped sound behavior is useful for UI flow and refactoring, but it is not a secure privacy boundary until the Cognito/API path replaces it.
