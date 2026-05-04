import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

const v2Dir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(v2Dir, "../..");

export default defineConfig(({ mode }) => {
  const fromFiles = loadEnv(mode, repoRoot, "");
  const portN = Number.parseInt(String(fromFiles.PORT ?? process.env.PORT ?? "4000"), 10);
  const localApiPort = Number.isFinite(portN) && portN > 0 && portN < 65536 ? portN : 4000;

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
    plugins: [react()]
  };
});
