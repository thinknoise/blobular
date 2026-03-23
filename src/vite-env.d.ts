/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BLOBULAR_AUTH_MODE?: "local-dev" | "cognito";
  readonly VITE_BLOBULAR_SOUND_LIBRARY_MODE?: "legacy-s3" | "api";
  readonly VITE_BLOBULAR_API_BASE_URL?: string;
  readonly VITE_BLOBULAR_COGNITO_REGION?: string;
  readonly VITE_BLOBULAR_COGNITO_USER_POOL_ID?: string;
  readonly VITE_BLOBULAR_COGNITO_CLIENT_ID?: string;
  readonly VITE_BLOBULAR_COGNITO_DOMAIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
