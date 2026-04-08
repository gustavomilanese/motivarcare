function trimApiBase(raw: string | undefined | null): string {
  return (raw ?? "").trim().replace(/\/+$/, "");
}

function isLoopbackHost(hostname: string): boolean {
  const h = hostname.trim().toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "[::1]" || h === "::1";
}

function apiUrlIsLoopback(apiUrl: string): boolean {
  try {
    return isLoopbackHost(new URL(apiUrl).hostname);
  } catch {
    return false;
  }
}

export type ResolveWebAppApiBaseParams = {
  /** `import.meta.env.VITE_API_URL` */
  viteApiUrl: string | undefined;
  /** `import.meta.env.DEV` */
  isDev: boolean;
  /** `import.meta.env.VITE_FORCE_REMOTE_API === "true"` */
  forceRemoteApi: boolean;
  /** `window.location.hostname` in the browser; empty during SSR or workers */
  browserHostname: string;
  /** Optional, e.g. `window.__THERAPY_API_BASE__` from index.html */
  injectedApiBase: string | undefined;
  /** e.g. `http://localhost:4000` */
  loopbackDefault: string;
};

/**
 * Evita que un `.env` con URL de producción rompa el `npm run dev` en localhost:
 * en modo dev y origen loopback, se usa el API local salvo override explícito.
 */
export function resolveWebAppApiBase(params: ResolveWebAppApiBaseParams): string {
  const fromVite = trimApiBase(params.viteApiUrl);
  const injected = trimApiBase(params.injectedApiBase);
  const browserLocal = isLoopbackHost(params.browserHostname);

  if (params.isDev && browserLocal && !params.forceRemoteApi) {
    if (fromVite && apiUrlIsLoopback(fromVite)) {
      return fromVite;
    }
    return trimApiBase(params.loopbackDefault) || params.loopbackDefault;
  }

  if (fromVite) {
    return fromVite;
  }
  if (injected) {
    return injected;
  }
  return trimApiBase(params.loopbackDefault) || params.loopbackDefault;
}
