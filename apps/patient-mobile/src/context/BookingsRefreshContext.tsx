import { createContext, type PropsWithChildren, useCallback, useContext, useMemo, useState } from "react";

type BookingsRefreshContextValue = {
  /** Se incrementa tras una reserva (o cancelación) para que Home/Sesiones vuelvan a pedir turnos. */
  bookingsEpoch: number;
  touchBookings: () => void;
};

const BookingsRefreshContext = createContext<BookingsRefreshContextValue | null>(null);

export function BookingsRefreshProvider(props: PropsWithChildren) {
  const [bookingsEpoch, setBookingsEpoch] = useState(0);
  const touchBookings = useCallback(() => {
    setBookingsEpoch((n) => n + 1);
  }, []);

  const value = useMemo(
    () => ({ bookingsEpoch, touchBookings }),
    [bookingsEpoch, touchBookings]
  );

  return <BookingsRefreshContext.Provider value={value}>{props.children}</BookingsRefreshContext.Provider>;
}

export function useBookingsRefresh() {
  const ctx = useContext(BookingsRefreshContext);
  if (!ctx) {
    throw new Error("useBookingsRefresh must be used within BookingsRefreshProvider");
  }
  return ctx;
}
