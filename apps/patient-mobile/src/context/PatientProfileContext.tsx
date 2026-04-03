import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getProfileMe } from "../api/client";
import type { PatientProfilePayload } from "../api/types";
import { useAuth } from "../auth/AuthContext";

type PatientProfileContextValue = {
  profile: PatientProfilePayload | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const PatientProfileContext = createContext<PatientProfileContextValue | null>(null);

export function PatientProfileProvider(props: PropsWithChildren) {
  const { token } = useAuth();
  const [profile, setProfile] = useState<PatientProfilePayload | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!token) {
      setProfile(null);
      return;
    }
    const response = await getProfileMe(token);
    setProfile(response.profile ?? null);
  }, [token]);

  useEffect(() => {
    let alive = true;

    const run = async () => {
      if (!token) {
        setProfile(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const response = await getProfileMe(token);
        if (!alive) {
          return;
        }
        setProfile(response.profile ?? null);
      } catch {
        if (alive) {
          setProfile(null);
        }
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    };

    void run();
    return () => {
      alive = false;
    };
  }, [token]);

  const value = useMemo(
    () => ({
      profile,
      loading,
      refresh
    }),
    [profile, loading, refresh]
  );

  return <PatientProfileContext.Provider value={value}>{props.children}</PatientProfileContext.Provider>;
}

export function usePatientProfile() {
  const ctx = useContext(PatientProfileContext);
  if (!ctx) {
    throw new Error("usePatientProfile must be used within PatientProfileProvider");
  }
  return ctx;
}
