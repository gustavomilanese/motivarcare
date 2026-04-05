import { type ReactNode } from "react";

export function CollapsiblePageSection(props: {
  sectionId: string;
  summary: ReactNode;
  summaryEnd?: ReactNode;
  children: ReactNode;
  /** Clases extra en el &lt;section&gt; externo (p. ej. dashboard-section). */
  sectionClassName?: string;
  bodyExtraClass?: string;
  /** Por defecto cerrado. */
  defaultOpen?: boolean;
}) {
  return (
    <section
      id={props.sectionId}
      className={`finance-anchor-section ${props.sectionClassName ?? ""}`.trim()}
    >
      <details
        className="finance-collapsible card"
        {...(props.defaultOpen ? { open: true } : {})}
      >
        <summary className="finance-collapsible-summary">
          <div className="finance-collapsible-summary-lead">
            <span className="finance-collapsible-title">{props.summary}</span>
            {props.summaryEnd ?? null}
          </div>
          <span className="finance-collapsible-chevron" aria-hidden />
        </summary>
        <div className={`finance-collapsible-body ${props.bodyExtraClass ?? ""}`.trim()}>{props.children}</div>
      </details>
    </section>
  );
}
