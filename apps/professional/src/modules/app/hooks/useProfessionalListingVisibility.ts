import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../services/api";

type RegistrationApproval = "PENDING" | "APPROVED" | "REJECTED";

export function useProfessionalListingVisibility(token: string) {
  const [visible, setVisible] = useState<boolean | null>(null);
  const [registrationApproval, setRegistrationApproval] = useState<RegistrationApproval | null>(null);
  const [ready, setReady] = useState(false);

  const reload = useCallback(async () => {
    try {
      const response = await apiRequest<{
        profile: {
          visible: boolean;
          registrationApproval?: RegistrationApproval;
        } | null;
      }>("/api/profiles/me", token);
      if (response.profile) {
        setVisible(response.profile.visible);
        setRegistrationApproval(response.profile.registrationApproval ?? "APPROVED");
      }
    } catch {
      // ignore — header control stays hidden until data loads
    } finally {
      setReady(true);
    }
  }, [token]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    ready,
    visible,
    registrationApproval,
    setVisible,
    reload
  };
}
