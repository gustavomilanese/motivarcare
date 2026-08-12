import { useCallback, useEffect, useState } from "react";
import { getBookingsMine } from "../api/client";
import type { BookingItem } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { usePatientProfile } from "../context/PatientProfileContext";
import { usePushNotifications } from "./usePushNotifications";

/**
 * Host autenticado: carga bookings y registra push / recordatorios locales.
 */
export function PushNotificationsHost() {
  const { token } = useAuth();
  const { profile } = usePatientProfile();
  const [bookings, setBookings] = useState<BookingItem[]>([]);

  const load = useCallback(async () => {
    if (!token) {
      setBookings([]);
      return;
    }
    try {
      const res = await getBookingsMine(token);
      setBookings(res.bookings ?? []);
    } catch {
      // noop — no bloquear portal
    }
  }, [token]);

  useEffect(() => {
    void load();
    if (!token) return;
    const id = setInterval(() => void load(), 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [token, load]);

  usePushNotifications({
    token,
    bookings,
    remindersEnabled: profile?.notificationsReminder !== false
  });

  return null;
}
