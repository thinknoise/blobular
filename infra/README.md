# Blobular Auth + Sounds Infrastructure

This branch now has the frontend seam for a real auth-backed sound library:

- the app has an auth boundary
- new uploads are modeled as `SoundRecord`s instead of raw S3 keys
- user-scoped S3 prefixes are now possible without another UI rewrite

What is still missing is the real backend enforcement. The goal state is:

1. Cognito User Pool handles sign up, sign in, and session tokens.
2. API Gateway + Lambda enforce which sounds a caller can list, mutate, and download.
3. DynamoDB stores sound metadata and visibility.
4. S3 stays private and files are accessed with presigned URLs.

## Files

- `cloudformation/blobular-auth-sounds.yaml`
  Defines the AWS resources for Cognito, DynamoDB, Lambda, and HTTP API.
- `lambda/sounds/index.mjs`
  Placeholder handler entrypoint for the sounds API routes.

## Deployment shape

This scaffold assumes:

- existing audio bucket remains in place
- Lambda code is zipped separately and uploaded to S3
- frontend gets its config from Vite env vars

Minimum frontend env vars after deployment:

- `VITE_BLOBULAR_AUTH_MODE=cognito`
- `VITE_BLOBULAR_SOUND_LIBRARY_MODE=api`
- `VITE_BLOBULAR_API_BASE_URL=<http api base url>`
- `VITE_BLOBULAR_COGNITO_REGION=<aws region>`
- `VITE_BLOBULAR_COGNITO_USER_POOL_ID=<user pool id>`
- `VITE_BLOBULAR_COGNITO_CLIENT_ID=<user pool client id>`
- `VITE_BLOBULAR_COGNITO_DOMAIN=<managed login domain>`

CloudFormation parameters to expect:

- `ExistingAudioBucketName`
- `AppOrigin`
- `AppCallbackUrl`
- `CognitoDomainPrefix`
- `LambdaArtifactBucket`
- `LambdaArtifactKey`

## Current limitation

The app still uses the temporary browser-side implementations:

- local browser auth storage
- direct S3 access for sound listing and upload

That means the new user-scoped sound behavior is useful for UI flow and refactoring, but it is not a secure privacy boundary until the Cognito/API path replaces it.
