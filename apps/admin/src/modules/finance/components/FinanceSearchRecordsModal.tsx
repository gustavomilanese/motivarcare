import { type ReactNode, useEffect } from "react";

export function FinanceSearchRecordsModal(props: {
  open: boolean;
  onClose: () => void;
  title: string;
  closeLabel: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!props.open) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        props.onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [props.open, props.onClose]);

  if (!props.open) {
    return null;
  }

  return (
    <div className="finance-search-modal-root">
      <button type="button" className="finance-search-modal-backdrop" aria-label={props.closeLabel} onClick={props.onClose} />
      <div
        className="finance-search-modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="finance-search-modal-title"
      >
        <header className="finance-search-modal-head">
          <h2 id="finance-search-modal-title">{props.title}</h2>
          <button type="button" className="finance-search-modal-close" onClick={props.onClose} aria-label={props.closeLabel}>
            ×
          </button>
        </header>
        <div className="finance-search-modal-body">{props.children}</div>
      </div>
    </div>
  );
}
