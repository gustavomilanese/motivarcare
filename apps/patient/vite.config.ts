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
  /** Vercel/Railway: VITE_API_URL o API_PUBLIC_URL (misma URL pública del API que en el backend). */
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
          target: "http://127.0.0.1:4000",
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
