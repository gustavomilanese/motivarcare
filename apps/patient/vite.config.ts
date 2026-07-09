import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

const patientDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(patientDir, "../..");

/** Meta en HTML para verificar en prod (View Source) que Vercel inyectó VITE_API_URL en el build. */
function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

export default defineConfig(({ mode }) => {
  const fromFiles = loadEnv(mode, repoRoot, "");
  const portRaw = fromFiles.PORT ?? process.env.PORT ?? "4000";
  const portN = Number.parseInt(String(portRaw), 10);
  const localApiPort = Number.isFinite(portN) && portN > 0 && portN < 65536 ? portN : 4000;

  const apiProxyTarget = (() => {
    const fromProcess = (process.env.API_PROXY_TARGET ?? process.env.VITE_API_PROXY_TARGET ?? "").trim();
    if (fromProcess) {
      return fromProcess.replace(/\/+$/, "");
    }
    const fromFile = (fromFiles.API_PROXY_TARGET ?? fromFiles.VITE_API_PROXY_TARGET ?? "").trim();
    if (fromFile) {
      return fromFile.replace(/\/+$/, "");
    }
    return `http://127.0.0.1:${localApiPort}`;
  })();
  /** Vercel/Railway: VITE_API_URL o API_PUBLIC_URL (misma URL pública del API que en el backend). */
  const apiBase = (
    fromFiles.VITE_API_URL ??
    process.env.VITE_API_URL ??
    process.env.API_PUBLIC_URL ??
    ""
  )
    .trim()
    .replace(/\/+$/, "");

  if (mode === "production") {
    if (!apiBase) {
      throw new Error(
        "[@therapy/patient] Production build requires VITE_API_URL or API_PUBLIC_URL (public API base URL)."
      );
    }
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(apiBase)) {
      throw new Error(
        `[@therapy/patient] Production build cannot target localhost API (${apiBase}). Set VITE_API_URL to the deployed API.`
      );
    }
  }

  return {
    envDir: repoRoot,
    server: {
      proxy: {
        "/api": {
          target: apiProxyTarget,
          changeOrigin: true
        }
      }
    },
    plugins: [
      {
        name: "inject-vite-api-base-meta",
        transformIndexHtml(html) {
          const meta = `<meta name="x-therapy-api-base" content="${escapeAttr(apiBase)}" />`;
          const boot = `<script>window.__THERAPY_API_BASE__=${JSON.stringify(apiBase)};</script>`;
          return html.replace("<head>", `<head>\n    ${meta}\n    ${boot}`);
        }
      },
      react()
    ]
  };
});
