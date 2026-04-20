/**
 * Ejecuta `callback` cada `intervalMs` solo cuando `document.visibilityState === "visible"`.
 * Al volver a la pestaña, dispara un tick extra para datos frescos sin esperar al próximo intervalo.
 */
export function subscribeDocumentVisibleInterval(callback: () => void, intervalMs: number): () => void {
  const safeMs = Math.max(1000, Math.floor(intervalMs));

  const tick = () => {
    if (typeof document === "undefined" || document.visibilityState !== "visible") {
      return;
    }
    callback();
  };

  const id = window.setInterval(tick, safeMs);

  const onVisibility = () => {
    tick();
  };

  document.addEventListener("visibilitychange", onVisibility);

  return () => {
    window.clearInterval(id);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}
