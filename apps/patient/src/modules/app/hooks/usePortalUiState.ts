import { useEffect, useState } from "react";
import type { PatientAppState, ProfileTab } from "../types";

export function usePortalUiState(params: {
  navigate: (path: string) => void;
  onStateChange: (updater: (current: PatientAppState) => PatientAppState) => void;
  onLogout: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen && !preferencesOpen && !notificationsOpen) {
      return;
    }

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }
      setMenuOpen(false);
      setPreferencesOpen(false);
      setNotificationsOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen, notificationsOpen, preferencesOpen]);

  return {
    menuOpen,
    notificationsOpen,
    preferencesOpen,
    toggleMenu: () => {
      setNotificationsOpen(false);
      setMenuOpen((current) => !current);
    },
    toggleNotifications: () => {
      setMenuOpen(false);
      setPreferencesOpen(false);
      setNotificationsOpen((current) => !current);
    },
    openNotificationThread: (professionalId: string) => {
      setNotificationsOpen(false);
      params.onStateChange((current) => ({ ...current, activeChatProfessionalId: professionalId }));
      params.navigate("/chat");
    },
    openProfileTabFromMenu: (tab: ProfileTab) => {
      setMenuOpen(false);
      params.navigate(`/profile?tab=${tab}`);
    },
    openPreferences: () => {
      setMenuOpen(false);
      setNotificationsOpen(false);
      setPreferencesOpen(true);
    },
    closePreferences: () => setPreferencesOpen(false),
    logoutFromMenu: () => {
      setMenuOpen(false);
      setNotificationsOpen(false);
      params.onLogout();
      params.navigate("/");
    }
  };
}
