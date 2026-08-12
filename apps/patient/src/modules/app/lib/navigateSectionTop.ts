import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
import type { NavigateFunction, To } from "react-router-dom";

const PORTAL_SCROLL_SELECTORS = [
  ".portal-main-content",
  ".portal-main",
  ".portal-shell",
  "[data-portal-scroll]"
] as const;

function resetElementScroll(node: HTMLElement, behavior: ScrollBehavior) {
  if (typeof node.scrollTo === "function") {
    node.scrollTo({ top: 0, left: 0, behavior });
  }
  node.scrollTop = 0;
  node.scrollLeft = 0;
}

/** Scroll del portal paciente al inicio del documento (window + contenedores del shell). */
export function scrollPortalToTop(behavior: ScrollBehavior = "auto") {
  window.scrollTo({ top: 0, left: 0, behavior });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;

  for (const selector of PORTAL_SCROLL_SELECTORS) {
    document.querySelectorAll<HTMLElement>(selector).forEach((node) => {
      resetElementScroll(node, behavior);
    });
  }

  // Cualquier ancestro scrolleable que haya quedado a mitad de página.
  const marked = document.querySelector<HTMLElement>("[data-section-top-anchor]");
  if (marked) {
    let parent: HTMLElement | null = marked.parentElement;
    while (parent && parent !== document.body) {
      const style = window.getComputedStyle(parent);
      const overflowY = style.overflowY;
      if (
        (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay")
        && parent.scrollHeight > parent.clientHeight + 1
      ) {
        resetElementScroll(parent, behavior);
      }
      parent = parent.parentElement;
    }
    marked.scrollIntoView({ block: "start", inline: "nearest" });
  }
}

function scheduleScrollPortalToTop() {
  scrollPortalToTop("auto");
  requestAnimationFrame(() => {
    scrollPortalToTop("auto");
    requestAnimationFrame(() => {
      scrollPortalToTop("auto");
    });
  });
  return window.setTimeout(() => {
    scrollPortalToTop("auto");
  }, 120);
}

/**
 * Navega a una sección y asegura aterrizar en el tope
 * (evita restaurar scroll previo o quedar a mitad de página).
 */
export function navigateToSectionTop(navigate: NavigateFunction, to: To) {
  navigate(to);
  scheduleScrollPortalToTop();
}

/**
 * Al montar / cambiar de ruta (y cuando cambia `resetKey`, p. ej. fin de loading),
 * lleva el viewport al tope.
 */
export function useScrollSectionToTopOnMount(enabled = true, resetKey?: string | number | boolean) {
  const location = useLocation();

  useLayoutEffect(() => {
    if (!enabled) {
      return;
    }
    const previous = window.history.scrollRestoration;
    try {
      window.history.scrollRestoration = "manual";
    } catch {
      // ignore
    }
    const timeout = scheduleScrollPortalToTop();
    return () => {
      window.clearTimeout(timeout);
      try {
        window.history.scrollRestoration = previous;
      } catch {
        // ignore
      }
    };
  }, [enabled, resetKey, location.pathname, location.search]);
}
