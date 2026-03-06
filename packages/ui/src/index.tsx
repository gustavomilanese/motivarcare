import type { ReactNode } from "react";

export function PageShell(props: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section
      style={{
        background: "white",
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        padding: 20
      }}
    >
      <h2 style={{ margin: "0 0 8px 0" }}>{props.title}</h2>
      {props.subtitle ? <p style={{ margin: "0 0 12px 0", color: "#475569" }}>{props.subtitle}</p> : null}
      {props.children}
    </section>
  );
}
