/// <reference types="vitest" />

import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const authProxyTarget = env.VITE_BLOBULAR_AUTH_API_PROXY_TARGET?.trim();
  const apiProxy =
    authProxyTarget === undefined || authProxyTarget === ""
      ? undefined
      : {
          "/api": {
            target: authProxyTarget,
            changeOrigin: true,
          },
          "/blobular/api": {
            target: authProxyTarget,
            changeOrigin: true,
          },
        };

  return {
    plugins: [react(), vanillaExtractPlugin()],
    base: "/blobular/",
    server: apiProxy
      ? {
          proxy: apiProxy,
        }
      : undefined,
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: ["./src/test/setup.ts"],
      include: ["src/**/*.test.{ts,tsx}"],
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
  };
});
