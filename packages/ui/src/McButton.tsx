import type { ButtonHTMLAttributes, ReactNode } from "react";

type McButtonVariant = "primary";

export function McButton(
  props: ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: McButtonVariant;
    children: ReactNode;
  }
) {
  const { variant = "primary", className, children, type = "button", ...rest } = props;
  return (
    <button
      {...rest}
      type={type}
      className={["mc-btn", `mc-btn--${variant}`, className].filter(Boolean).join(" ")}
    >
      {children}
    </button>
  );
}
