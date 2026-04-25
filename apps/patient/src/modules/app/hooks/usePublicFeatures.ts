import { useEffect, useState } from "react";
import { apiRequest } from "../services/api";

/**
 * Feature flags públicos del backend (sin auth).
 * Mantener este shape sincronizado con `GET /api/public/features` en el API.
 */
export interface PublicFeaturesFlags {
  intakeChatEnabled: boolean;
}

const DEFAULT_FLAGS: PublicFeaturesFlags = {
  intakeChatEnabled: false
};

/**
 * Hook que carga los feature flags públicos al montar.
 * Cachea el resultado en memoria del módulo: una sola request por carga de SPA.
 *
 * Si el endpoint falla, asumimos `intakeChatEnabled: false` (degradación segura
 * al wizard tradicional).
 */
let cachedFlagsPromise: Promise<PublicFeaturesFlags> | null = null;

function loadFeatures(): Promise<PublicFeaturesFlags> {
  if (cachedFlagsPromise) return cachedFlagsPromise;
  cachedFlagsPromise = apiRequest<Partial<PublicFeaturesFlags>>("/api/public/features", { method: "GET" })
    .then((raw) => ({
      intakeChatEnabled: Boolean(raw?.intakeChatEnabled)
    }))
    .catch((err) => {
      console.warn("[usePublicFeatures] no pude leer /api/public/features:", err instanceof Error ? err.message : err);
      cachedFlagsPromise = null;
      return DEFAULT_FLAGS;
    });
  return cachedFlagsPromise;
}

export function usePublicFeatures(): { flags: PublicFeaturesFlags; loading: boolean } {
  const [flags, setFlags] = useState<PublicFeaturesFlags>(DEFAULT_FLAGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    loadFeatures().then((next) => {
      if (cancelled) return;
      setFlags(next);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { flags, loading };
}
