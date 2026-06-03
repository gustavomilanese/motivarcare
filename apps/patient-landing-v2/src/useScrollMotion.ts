import { useEffect, useState, type RefObject } from "react";

export function useScrollY(): number {
  const [y, setY] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onMq = () => setReduced(mq.matches);
    mq.addEventListener("change", onMq);
    return () => mq.removeEventListener("change", onMq);
  }, []);

  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      setY(window.scrollY);
    };
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [reduced]);

  return reduced ? 0 : y;
}

/** Parallax suave al hacer scroll; desactivado en móvil y con prefers-reduced-motion. */
export function useSectionParallax(
  sectionRef: RefObject<HTMLElement | null>,
  options?: { factor?: number; disableMaxWidthPx?: number }
): number {
  const factor = options?.factor ?? -0.1;
  const disableMaxWidthPx = options?.disableMaxWidthPx ?? 960;
  const [parallaxY, setParallaxY] = useState(0);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const update = () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setParallaxY(0);
        return;
      }
      if (window.matchMedia(`(max-width: ${disableMaxWidthPx}px)`).matches) {
        setParallaxY(0);
        return;
      }
      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight;
      const centerOffset = rect.top + rect.height / 2 - vh / 2;
      setParallaxY(centerOffset * factor);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [factor, disableMaxWidthPx, sectionRef]);

  return parallaxY;
}
