import { type ReactNode, useState } from "react";

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
  /** Sin barra de título visible; abrís el bloque con `openStickyCollapsibleSection` o el botón + del padre. */
  visuallyHiddenSummary?: boolean;
  /** Nombre accesible del bloque cuando el summary está oculto. */
  detailsAriaLabel?: string;
}) {
  const [open, setOpen] = useState(props.defaultOpen ?? false);

  return (
    <section
      id={props.sectionId}
      className={`finance-anchor-section ${props.sectionClassName ?? ""}`.trim()}
    >
      <details
        className={`finance-collapsible card${props.visuallyHiddenSummary ? " finance-collapsible--hidden-summary" : ""}`.trim()}
        open={open}
        onToggle={(e) => setOpen(e.currentTarget.open)}
        aria-label={props.visuallyHiddenSummary ? props.detailsAriaLabel : undefined}
      >
        <summary className="finance-collapsible-summary">
          <div className="finance-collapsible-summary-lead">
            <span className="finance-collapsible-title">{props.summary}</span>
            {props.summaryEnd ?? null}
          </div>
          {props.visuallyHiddenSummary ? null : <span className="finance-collapsible-chevron" aria-hidden />}
        </summary>
        <div className={`finance-collapsible-body ${props.bodyExtraClass ?? ""}`.trim()}>{props.children}</div>
      </details>
    </section>
  );
}
