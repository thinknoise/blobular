/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BLOBULAR_AUTH_MODE?: "local-dev" | "modelglue-db";
  readonly VITE_BLOBULAR_AUTH_API_BASE_URL?: string;
  readonly VITE_BLOBULAR_AUTH_API_PROXY_TARGET?: string;
  readonly VITE_BLOBULAR_SOUND_LIBRARY_MODE?: "legacy-s3" | "api";
  readonly VITE_BLOBULAR_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
