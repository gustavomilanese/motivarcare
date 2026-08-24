import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { McIconButton } from "./McIconButton";

export function McModal(props: {
  open: boolean;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  closeLabel: string;
  closeDisabled?: boolean;
  size?: "md" | "lg";
  className?: string;
}) {
  const titleId = useId();
  const size = props.size ?? "md";
  const onCloseRef = useRef(props.onClose);
  onCloseRef.current = props.onClose;

  useEffect(() => {
    if (!props.open) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !props.closeDisabled) {
        onCloseRef.current();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [props.open, props.closeDisabled]);

  if (!props.open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="mc-modal-backdrop"
      role="presentation"
      onClick={() => {
        if (!props.closeDisabled) {
          props.onClose();
        }
      }}
    >
      <section
        className={["mc-modal", `mc-modal--${size}`, props.className].filter(Boolean).join(" ")}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="mc-modal__head">
          <h2 id={titleId} className="mc-modal__title">
            {props.title}
          </h2>
          <McIconButton label={props.closeLabel} disabled={props.closeDisabled} onClick={props.onClose}>
            ×
          </McIconButton>
        </header>
        <div className="mc-modal__body">{props.children}</div>
        {props.footer ? <footer className="mc-modal__footer">{props.footer}</footer> : null}
      </section>
    </div>,
    document.body
  );
}
