import type { ReactNode } from "react";

/** Mancha DS (`icono-mancha` app-usuario) + contenido encima. */
export function CalmPayMancha(props: { children: ReactNode; className?: string }) {
  return (
    <span className={props.className ?? "calm-pay-mancha"} aria-hidden="true">
      <svg className="calm-pay-mancha-blob" viewBox="0 0 100 100">
        <path d="M82 64c-6 18-26 28-44 24S8 68 10 48 28 12 50 12s38 34 32 52z" fill="#2F6B51" opacity="0.85" />
      </svg>
      {props.children}
    </span>
  );
}
