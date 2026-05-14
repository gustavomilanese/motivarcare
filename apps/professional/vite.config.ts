import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const appDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(appDir, "../..");

/**
 * Destino del proxy `/api` en `npm run dev`.
 * En Docker, `127.0.0.1` es el propio contenedor: usá `API_PROXY_TARGET` (p. ej. `http://host.docker.internal:4000`
 * si el API corre en el host, o `http://nombre-servicio:4000` si comparte red con el API).
 */
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
