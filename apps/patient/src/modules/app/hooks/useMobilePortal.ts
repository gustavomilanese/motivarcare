import { useEffect, useState } from "react";

/** Matches `mobile-portal-flat.css` — tablet + phone portal UX, not desktop. */
const MOBILE_PORTAL_MEDIA = "(max-width: 1080px)";

export function useMobilePortal(): boolean {
  const [isMobilePortal, setIsMobilePortal] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(MOBILE_PORTAL_MEDIA).matches : false
  );

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_PORTAL_MEDIA);
    const sync = () => setIsMobilePortal(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return isMobilePortal;
}
