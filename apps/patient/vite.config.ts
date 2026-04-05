import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

/** Meta en HTML para verificar en prod (View Source) que Vercel inyectó VITE_API_URL en el build. */
function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

export default defineConfig(({ mode }) => {
  const fromFiles = loadEnv(mode, process.cwd(), "");
  // CI (Vercel) inyecta VITE_* en process.env; loadEnv solo lee archivos .env
  const apiBase = (fromFiles.VITE_API_URL ?? process.env.VITE_API_URL ?? "").trim();

  return {
    plugins: [
      {
        name: "inject-vite-api-base-meta",
        transformIndexHtml(html) {
          return html.replace(
            "<head>",
            `<head>\n    <meta name="x-therapy-api-base" content="${escapeAttr(apiBase)}" />`
          );
        }
      },
      react()
    ]
  };
});
