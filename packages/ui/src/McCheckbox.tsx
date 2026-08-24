import type { InputHTMLAttributes, ReactNode } from "react";

export function McCheckbox(
  props: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
    children: ReactNode;
  }
) {
  const { children, className, ...rest } = props;
  return (
    <label className={["mc-check", className].filter(Boolean).join(" ")}>
      <input {...rest} type="checkbox" />
      <span>{children}</span>
    </label>
  );
}
