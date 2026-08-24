import { useState, type InputHTMLAttributes, type ReactNode } from "react";

export function McPasswordInput(
  props: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
    label?: ReactNode;
    headerExtra?: ReactNode;
    showLabel: string;
    hideLabel: string;
  }
) {
  const { label, headerExtra, showLabel, hideLabel, className, ...rest } = props;
  const [visible, setVisible] = useState(false);
  return (
    <div className="mc-field">
      <div className="mc-field__head">
        {label != null ? <span className="mc-field__label">{label}</span> : <span />}
        {headerExtra}
      </div>
      <div className="mc-input">
        <input
          {...rest}
          type={visible ? "text" : "password"}
          className={["mc-input__control", className].filter(Boolean).join(" ")}
        />
        <button
          type="button"
          className="mc-input__suffix"
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? hideLabel : showLabel}
        </button>
      </div>
    </div>
  );
}
