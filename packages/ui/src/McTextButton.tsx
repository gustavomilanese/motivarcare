import type { ButtonHTMLAttributes, ReactNode } from "react";

export function McTextButton(
  props: ButtonHTMLAttributes<HTMLButtonElement> & {
    children: ReactNode;
  }
) {
  const { className, type = "button", children, ...rest } = props;
  return (
    <button {...rest} type={type} className={["mc-text-btn", className].filter(Boolean).join(" ")}>
      {children}
    </button>
  );
}
