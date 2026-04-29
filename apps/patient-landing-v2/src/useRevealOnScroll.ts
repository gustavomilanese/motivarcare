import { useEffect } from "react";

/**
 * Añade la clase `pl2-reveal--visible` a nodos `[data-pl2-reveal]` cuando entran en viewport.
 * Sin dependencias; respeta `prefers-reduced-motion` (mostramos todo sin animar).
 */
export function useRevealOnScroll(): void {
  useEffect(() => {
    const revealAttr = "[data-pl2-reveal]";

    const showAll = () => {
      document.querySelectorAll(revealAttr).forEach((el) => {
        el.classList.add("pl2-reveal--visible");
      });
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      showAll();
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      showAll();
      return;
    }

    const elements = document.querySelectorAll<HTMLElement>(revealAttr);
    if (elements.length === 0) {
      return;
    }

    const io = new IntersectionObserver(
      (entries, observer) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || !(entry.target instanceof HTMLElement)) {
            continue;
          }
          entry.target.classList.add("pl2-reveal--visible");
          observer.unobserve(entry.target);
        }
      },
      {
        root: null,
        rootMargin: "0px 0px -10% 0px",
        threshold: 0.08
      }
    );

    elements.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}
