import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useNavigationType } from "react-router-dom";

/** True when this SPA session has a previous screen to return to (does not leave the app). */
export function useInAppBack() {
  const navigate = useNavigate();
  const location = useLocation();
  const navType = useNavigationType();
  const [depth, setDepth] = useState(0);
  const seenKeyRef = useRef<string | null>(null);
  const navigatingRef = useRef(false);

  useEffect(() => {
    const key = location.key;
    if (seenKeyRef.current === key) {
      return;
    }
    const isFirst = seenKeyRef.current === null;
    seenKeyRef.current = key;
    navigatingRef.current = false;
    if (isFirst) {
      return;
    }
    if (navType === "PUSH") {
      setDepth((current) => current + 1);
      return;
    }
    if (navType === "POP") {
      setDepth((current) => Math.max(0, current - 1));
    }
  }, [location.key, navType]);

  return {
    canGoBack: depth > 0,
    goBack: () => {
      if (depth <= 0 || navigatingRef.current) {
        return;
      }
      navigatingRef.current = true;
      navigate(-1);
    }
  };
}
