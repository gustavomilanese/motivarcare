import { useLayoutEffect } from "react";
import type { NavigateFunction, To } from "react-router-dom";

/** Scroll del portal paciente al inicio del documento. */
export function scrollPortalToTop(behavior: ScrollBehavior = "auto") {
  window.scrollTo({ top: 0, left: 0, behavior });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

/**
 * Navega a una sección y asegura aterrizar en el tope
 * (evita restaurar scroll previo o quedar a mitad de página).
 */
export function navigateToSectionTop(navigate: NavigateFunction, to: To) {
  navigate(to);
  scrollPortalToTop("auto");
  requestAnimationFrame(() => {
    scrollPortalToTop("auto");
    requestAnimationFrame(() => {
      scrollPortalToTop("auto");
    });
  });
}

/** Al montar / cambiar de ruta, lleva el viewport al tope. */
export function useScrollSectionToTopOnMount(enabled = true) {
  useLayoutEffect(() => {
    if (!enabled) {
      return;
    }
    scrollPortalToTop("auto");
  }, [enabled]);
}
