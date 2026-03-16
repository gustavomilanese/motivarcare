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

export function InlineBadge(props: { children: ReactNode; tone?: "brand" | "neutral" }) {
  const brand = props.tone !== "neutral";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: "fit-content",
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 800,
        lineHeight: 1.2,
        background: brand ? "rgba(95, 69, 238, 0.12)" : "rgba(107, 114, 128, 0.12)",
        color: brand ? "#4f3ed6" : "#4b5563"
      }}
    >
      {props.children}
    </span>
  );
}
