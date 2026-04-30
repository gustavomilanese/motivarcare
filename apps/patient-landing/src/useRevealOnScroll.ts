import { useEffect, useRef } from "react";

const VISIBLE = "patient-ar-reveal--visible";

/** Añade `patient-ar-reveal--visible` cuando el elemento entra al viewport (una vez). Respeta prefers-reduced-motion. */
export function useRevealOnScroll<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      el.classList.add(VISIBLE);
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add(VISIBLE);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -5% 0px", threshold: 0.07 }
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  return ref;
}
