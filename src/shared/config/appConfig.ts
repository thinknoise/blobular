export type BlobularAuthMode = "local-dev" | "modelglue-db";

function normalizeBaseUrl(value?: string): string {
  return (value ?? "").trim().replace(/\/+$/, "");
}

function defaultAuthApiBaseUrl(): string {
  const baseUrl = (import.meta.env.BASE_URL || "/").trim();
  const normalizedBase = baseUrl.startsWith("/") ? baseUrl : `/${baseUrl}`;

  return `${normalizedBase.replace(/\/+$/, "")}/api`;
}

function resolveAuthMode(value?: string): BlobularAuthMode {
  return value === "local-dev" ? "local-dev" : "modelglue-db";
}

export const BLOBULAR_AUTH_MODE = resolveAuthMode(
  import.meta.env.VITE_BLOBULAR_AUTH_MODE
);

export const BLOBULAR_AUTH_API_BASE_URL =
  normalizeBaseUrl(import.meta.env.VITE_BLOBULAR_AUTH_API_BASE_URL) ||
  defaultAuthApiBaseUrl();

export function resolveAuthApiUrl(path: string): string {
  if (/^https?:\/\//.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return BLOBULAR_AUTH_API_BASE_URL
    ? `${BLOBULAR_AUTH_API_BASE_URL}${normalizedPath}`
    : normalizedPath;
}
