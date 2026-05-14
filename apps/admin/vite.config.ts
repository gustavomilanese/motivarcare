import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const appDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(appDir, "../..");

/** Ver `apps/professional/vite.config.ts`: mismo criterio para Docker vs `127.0.0.1`. */
function resolveApiProxyTarget(mode: string): string {
  const fromProcess = (process.env.API_PROXY_TARGET ?? process.env.VITE_API_PROXY_TARGET ?? "").trim();
  if (fromProcess) {
    return fromProcess.replace(/\/+$/, "");
  }
  const fromFiles = loadEnv(mode, repoRoot, "");
  const fromFile = (fromFiles.API_PROXY_TARGET ?? fromFiles.VITE_API_PROXY_TARGET ?? "").trim();
  if (fromFile) {
    return fromFile.replace(/\/+$/, "");
  }
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
        target: resolveApiProxyTarget(mode),
        changeOrigin: true
      }
    }
  },
  plugins: [react()]
}));
