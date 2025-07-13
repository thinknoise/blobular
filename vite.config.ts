import { defineConfig } from "vite";
import { visualizer } from "rollup-plugin-visualizer";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  base: "/blobular/",
  plugins: [react()],
  build: {
    rollupOptions: {
      plugins: [visualizer({ open: true })], // open report in browser
    },
  },
});
