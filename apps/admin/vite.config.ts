import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const appDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(appDir, "../..");

function localApiProxyTarget(mode: string): string {
  const fromFiles = loadEnv(mode, repoRoot, "");
  const raw = fromFiles.PORT ?? process.env.PORT ?? "4000";
  const n = Number.parseInt(String(raw), 10);
  const port = Number.isFinite(n) && n > 0 && n < 65536 ? n : 4000;
  return `http://127.0.0.1:${port}`;
}

export default defineConfig(({ mode }) => ({
  envDir: repoRoot,
  server: {
    proxy: {
      "/api": {
        target: localApiProxyTarget(mode),
        changeOrigin: true
      }
    }
  },
  plugins: [react()]
}));
