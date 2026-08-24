import type { ButtonHTMLAttributes, ReactNode } from "react";

export function McIconButton(
  props: ButtonHTMLAttributes<HTMLButtonElement> & {
    label: string;
    children: ReactNode;
  }
) {
  const { label, className, children, type = "button", ...rest } = props;
  return (
    <button
      {...rest}
      type={type}
      aria-label={label}
      className={["mc-icon-btn", className].filter(Boolean).join(" ")}
    >
      {children}
    </button>
  );
}
