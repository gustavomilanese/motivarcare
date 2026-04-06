import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_ACTIVATION_PX = 100;

export function isStickySectionId<T extends string>(sectionIds: readonly T[], value: string): value is T {
  return (sectionIds as readonly string[]).includes(value);
}

/** Abre el details interno de una sección colapsable tipo Finanzas. */
export function openStickyCollapsibleSection(sectionId: string) {
  const section = document.getElementById(sectionId);
  const details = section?.querySelector("details.finance-collapsible");
  if (details instanceof HTMLDetailsElement) {
    details.open = true;
  }
}

/** Cierra el details interno de una sección colapsable. */
export function closeStickyCollapsibleSection(sectionId: string) {
  const section = document.getElementById(sectionId);
  const details = section?.querySelector("details.finance-collapsible");
  if (details instanceof HTMLDetailsElement) {
    details.open = false;
  }
}

/**
 * Scroll spy + hash + scroll a anclas para páginas con `CollapsiblePageSection` / `finance-collapsible`.
 */
export function useStickySectionNavigation<T extends string>(
  sectionIds: readonly T[],
  options: { loading?: boolean; activationPx?: number } = {}
) {
  const loading = options.loading ?? false;
  const activationPx = options.activationPx ?? DEFAULT_ACTIVATION_PX;
  const [activeSection, setActiveSection] = useState<T>(sectionIds[0]);
  const scrollSpyTicking = useRef(false);
  const sectionIdsRef = useRef(sectionIds);
  sectionIdsRef.current = sectionIds;
  const sectionIdsKey = sectionIds.join("|");

  const scrollToSection = useCallback(
    (id: T) => {
      setActiveSection(id);
      window.history.replaceState(null, "", `#${id}`);
      requestAnimationFrame(() => {
        openStickyCollapsibleSection(id);
        requestAnimationFrame(() => {
          document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      });
    },
    []
  );

  useEffect(() => {
    const ids = sectionIdsRef.current;
    const raw = window.location.hash.replace(/^#/, "");
    if (raw && isStickySectionId(ids, raw)) {
      setActiveSection(raw);
      requestAnimationFrame(() => {
        openStickyCollapsibleSection(raw);
        requestAnimationFrame(() => {
          document.getElementById(raw)?.scrollIntoView({ block: "start" });
        });
      });
    }
  }, [sectionIdsKey]);

  useEffect(() => {
    if (loading) {
      return;
    }
    const ids = sectionIdsRef.current;
    const updateFromScroll = () => {
      scrollSpyTicking.current = false;
      let current: T = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) {
          continue;
        }
        if (el.getBoundingClientRect().top <= activationPx) {
          current = id;
        }
      }
      setActiveSection((previous) => (previous === current ? previous : current));
    };

    const onScroll = () => {
      if (!scrollSpyTicking.current) {
        scrollSpyTicking.current = true;
        requestAnimationFrame(updateFromScroll);
      }
    };

    updateFromScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, [loading, activationPx, sectionIdsKey]);

  return { activeSection, scrollToSection };
}
