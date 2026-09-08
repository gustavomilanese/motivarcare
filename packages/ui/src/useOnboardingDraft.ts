import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

/**
 * Autoguardado del progreso de un onboarding contra el API.
 *
 * Vive en servidor (y no en `localStorage`) para que el usuario pueda cortar en la compu
 * y seguir en el teléfono, y para que el progreso no se pierda al limpiar el navegador.
 * El backend lo conserva por `ONBOARDING_DRAFT_TTL_DAYS` (15 días) desde el último guardado.
 */
export type OnboardingDraftKind = "patient_intake" | "professional_onboarding";

export interface OnboardingDraftSnapshot<TData> {
  /** Paso del wizard, para devolver al usuario exactamente donde estaba. */
  step: number;
  data: TData;
}

export interface OnboardingDraftTransport {
  get(kind: OnboardingDraftKind): Promise<{ step: number; data: unknown } | null>;
  put(kind: OnboardingDraftKind, payload: { step: number; data: unknown }): Promise<void>;
  remove(kind: OnboardingDraftKind): Promise<void>;
}

export type OnboardingDraftStatus = "loading" | "idle" | "saving" | "saved" | "error";

export interface UseOnboardingDraftResult {
  status: OnboardingDraftStatus;
  /** `true` si al entrar había progreso guardado y se restauró. Sirve para avisarle al usuario. */
  restored: boolean;
  /** Borra el borrador. Se llama al completar el flujo o si el usuario quiere empezar de cero. */
  discard: () => Promise<void>;
  /** Fuerza un guardado sin esperar el debounce (por ejemplo, antes de cerrar sesión). */
  flush: () => Promise<void>;
  lastError: Error | null;
}

/** Un cambio de paso se guarda al instante; escribir texto espera a que el usuario frene. */
const DEFAULT_DEBOUNCE_MS = 1000;

export function useOnboardingDraft<TData>(options: {
  kind: OnboardingDraftKind;
  /** Mientras sea `false` no se lee ni se escribe (p. ej. antes de tener token). */
  enabled: boolean;
  transport: OnboardingDraftTransport;
  /**
   * Lo que se quiere persistir. Tiene que venir memoizado (`useMemo`): se serializa
   * cada vez que cambia su identidad, y un formulario con una foto adentro es caro
   * de serializar en cada tecla.
   */
  value: OnboardingDraftSnapshot<TData>;
  /** Se invoca una sola vez, sólo si había progreso guardado y vigente. */
  onRestore: (draft: OnboardingDraftSnapshot<TData>) => void;
  debounceMs?: number;
}): UseOnboardingDraftResult {
  const { kind, enabled, transport, value, onRestore, debounceMs = DEFAULT_DEBOUNCE_MS } = options;

  const [status, setStatus] = useState<OnboardingDraftStatus>(enabled ? "loading" : "idle");
  const [restored, setRestored] = useState(false);
  const [lastError, setLastError] = useState<Error | null>(null);

  /** Hasta no terminar de leer el borrador no se escribe: si no, el estado vacío inicial lo pisaría. */
  const hydratedRef = useRef(false);
  const discardedRef = useRef(false);
  const lastSavedRef = useRef<string | null>(null);
  const lastStepRef = useRef<number | null>(null);
  // Refs para que el efecto de autoguardado no dependa de identidades que cambian en cada render.
  const transportRef = useRef(transport);
  const onRestoreRef = useRef(onRestore);
  const pendingRef = useRef<{ snapshot: OnboardingDraftSnapshot<TData>; serialized: string } | null>(null);

  // En un layout effect y no durante el render: escribir refs mientras se renderiza no es seguro.
  useLayoutEffect(() => {
    transportRef.current = transport;
    onRestoreRef.current = onRestore;
  });

  useEffect(() => {
    if (!enabled || hydratedRef.current) {
      return;
    }

    let cancelled = false;
    setStatus("loading");

    void (async () => {
      try {
        const draft = await transportRef.current.get(kind);
        if (cancelled) return;
        if (draft) {
          onRestoreRef.current({ step: draft.step, data: draft.data as TData });
          setRestored(true);
        }
      } catch (error) {
        // Que falle la lectura no puede bloquear el onboarding: se sigue como si no hubiera borrador.
        if (!cancelled) setLastError(error instanceof Error ? error : new Error(String(error)));
      } finally {
        if (!cancelled) {
          hydratedRef.current = true;
          setStatus("idle");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, kind]);

  const persist = useCallback(
    async (snapshot: OnboardingDraftSnapshot<TData>, serializedSnapshot: string) => {
      if (discardedRef.current) return;

      setStatus("saving");
      try {
        await transportRef.current.put(kind, { step: snapshot.step, data: snapshot.data });
        lastSavedRef.current = serializedSnapshot;
        pendingRef.current = null;
        setLastError(null);
        setStatus("saved");
      } catch (error) {
        setLastError(error instanceof Error ? error : new Error(String(error)));
        setStatus("error");
      }
    },
    [kind]
  );

  // Sólo se serializa cuando el snapshot realmente cambió, no en cada render del formulario.
  const serialized = useMemo(() => JSON.stringify(value), [value]);

  useEffect(() => {
    if (!enabled || !hydratedRef.current || discardedRef.current) {
      return;
    }
    if (serialized === lastSavedRef.current) {
      return;
    }

    pendingRef.current = { snapshot: value, serialized };

    const stepChanged = lastStepRef.current !== null && lastStepRef.current !== value.step;
    lastStepRef.current = value.step;

    if (stepChanged) {
      void persist(value, serialized);
      return;
    }

    const timer = setTimeout(() => void persist(value, serialized), debounceMs);
    return () => clearTimeout(timer);
  }, [serialized, value, enabled, debounceMs, persist]);

  const flush = useCallback(async () => {
    const pending = pendingRef.current;
    if (!enabled || !hydratedRef.current || discardedRef.current || !pending) {
      return;
    }
    await persist(pending.snapshot, pending.serialized);
  }, [enabled, persist]);

  const discard = useCallback(async () => {
    discardedRef.current = true;
    pendingRef.current = null;
    setStatus("idle");
    setRestored(false);
    try {
      await transportRef.current.remove(kind);
    } catch {
      // El borrador vence solo a los 15 días: si el DELETE falla, no vale la pena molestar al usuario.
    }
  }, [kind]);

  return { status, restored, discard, flush, lastError };
}
