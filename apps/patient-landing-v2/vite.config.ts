import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

const v2Dir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(v2Dir, "../..");

/** Escapar para inyectar la URL del API en HTML (misma idea que el portal paciente). */
function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

export default defineConfig(({ mode }) => {
  const fromFiles = loadEnv(mode, repoRoot, "");
  const portN = Number.parseInt(String(fromFiles.PORT ?? process.env.PORT ?? "4000"), 10);
  const localApiPort = Number.isFinite(portN) && portN > 0 && portN < 65536 ? portN : 4000;

  const apiBase = (
    fromFiles.VITE_API_URL ??
    process.env.VITE_API_URL ??
    process.env.API_PUBLIC_URL ??
    ""
  )
    .trim()
    .replace(/\/+$/, "");

  return {
    envDir: repoRoot,
    server: {
      proxy: {
        "/api": {
          target: `http://127.0.0.1:${localApiPort}`,
          changeOrigin: true
        }
      }
    },
    plugins: [
      {
        name: "inject-therapy-api-base-plv2",
        transformIndexHtml(html: string) {
          const meta = `<meta name="x-therapy-api-base" content="${escapeAttr(apiBase)}" />`;
          const boot = `<script>window.__THERAPY_API_BASE__=${JSON.stringify(apiBase)};</script>`;
          return html.replace("<head>", `<head>\n    ${meta}\n    ${boot}`);
        }
      },
      react()
    ]
  };
});
