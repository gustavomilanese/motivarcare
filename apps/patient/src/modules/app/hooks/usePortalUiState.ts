import { useEffect, useState } from "react";
import type { PortalNotificationItem } from "../notifications/portalNotificationTypes";
import {
  clearPaymentFailureNotice,
  markAssignedProfessionalSeen,
  markExercisesPublishedAtSeen,
  markNotificationDismissed
} from "../notifications/portalNotificationStorage";
import type { PatientAppState, ProfileTab } from "../types";

export function usePortalUiState(params: {
  navigate: (path: string) => void;
  onStateChange: (updater: (current: PatientAppState) => PatientAppState) => void;
  onLogout: () => void;
  assignedProfessionalId: string | null;
  onOpenBooking: (bookingId: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  useEffect(() => {
    document.body.classList.toggle("portal-account-menu-open", menuOpen);
    return () => {
      document.body.classList.remove("portal-account-menu-open");
    };
  }, [menuOpen]);

  useEffect(() => {
    document.body.classList.toggle("portal-notifications-open", notificationsOpen);
    return () => {
      document.body.classList.remove("portal-notifications-open");
    };
  }, [notificationsOpen]);

  useEffect(() => {
    if (!menuOpen && !preferencesOpen && !notificationsOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }
      setMenuOpen(false);
      setPreferencesOpen(false);
      setNotificationsOpen(false);
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [menuOpen, notificationsOpen, preferencesOpen]);

  function openNotification(item: PortalNotificationItem) {
    setNotificationsOpen(false);
    markNotificationDismissed(item.id);

    if (item.kind === "payment-failed") {
      clearPaymentFailureNotice();
    }

    if (item.kind === "professional-assigned" && params.assignedProfessionalId) {
      markAssignedProfessionalSeen(params.assignedProfessionalId);
    }

    if (item.kind === "exercise-new") {
      markExercisesPublishedAtSeen(item.sortAt);
    }

    switch (item.action.type) {
      case "chat": {
        const professionalId = item.action.professionalId;
        params.onStateChange((current) => ({ ...current, activeChatProfessionalId: professionalId }));
        params.navigate("/chat");
        return;
      }
      case "navigate":
        params.navigate(item.action.path);
        return;
      case "booking":
        params.onOpenBooking(item.action.bookingId);
        params.navigate("/sessions");
        return;
      case "exercise":
        params.navigate(`/ejercicios/${item.action.slug}`);
        return;
      case "profile":
        params.navigate(`/profile?tab=${item.action.tab}`);
        return;
      default:
        return;
    }
  }

  return {
    menuOpen,
    notificationsOpen,
    preferencesOpen,
    toggleMenu: () => {
      setNotificationsOpen(false);
      setMenuOpen((current) => !current);
    },
    closeMenu: () => setMenuOpen(false),
    toggleNotifications: () => {
      setMenuOpen(false);
      setPreferencesOpen(false);
      setNotificationsOpen((current) => !current);
    },
    openNotification,
    openNotificationThread: (professionalId: string) => {
      openNotification({
        id: `chat-fallback-${professionalId}`,
        kind: "chat",
        title: "",
        body: "",
        detail: "",
        meta: "",
        unread: true,
        sortAt: new Date().toISOString(),
        action: { type: "chat", professionalId }
      });
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
