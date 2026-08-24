import type { InputHTMLAttributes, ReactNode } from "react";

export function McInput(
  props: InputHTMLAttributes<HTMLInputElement> & {
    label?: ReactNode;
    headerExtra?: ReactNode;
  }
) {
  const { label, headerExtra, className, ...rest } = props;
  const field = (
    <div className="mc-input">
      <input {...rest} className={["mc-input__control", className].filter(Boolean).join(" ")} />
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
