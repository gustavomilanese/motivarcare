import type { ReactNode, SelectHTMLAttributes } from "react";

export function McSelect(
  props: SelectHTMLAttributes<HTMLSelectElement> & {
    label?: ReactNode;
    headerExtra?: ReactNode;
  }
) {
  const { label, headerExtra, className, children, ...rest } = props;
  const field = (
    <div className="mc-input">
      <select {...rest} className={["mc-input__control", "mc-input__control--select", className].filter(Boolean).join(" ")}>
        {children}
      </select>
    </div>
  );
  if (label == null && headerExtra == null) {
    return field;
  }
  return (
    <div className="mc-field">
      <div className="mc-field__head">
        {label != null ? <span className="mc-field__label">{label}</span> : <span />}
        {headerExtra}
      </div>
      {field}
    </div>
  );
}
