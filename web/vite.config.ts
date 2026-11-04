import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In development, Vite serves the pages and forwards API calls to the backend (npm run serve).
// In production, `npm run build` writes web/dist and the backend serves it on the same port.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": { target: "http://127.0.0.1:8787", changeOrigin: false },
      "/v1": { target: "http://127.0.0.1:8787", changeOrigin: false },
    },
  },
  build: { outDir: "dist", emptyOutDir: true },
});
