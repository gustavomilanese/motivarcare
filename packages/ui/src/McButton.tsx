import type { ButtonHTMLAttributes, ReactNode } from "react";

type McButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export function McButton(
  props: ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: McButtonVariant;
    fullWidth?: boolean;
    children: ReactNode;
  }
) {
  const { variant = "primary", fullWidth = true, className, children, type = "button", ...rest } = props;
  return (
    <button
      {...rest}
      type={type}
      className={["mc-btn", `mc-btn--${variant}`, fullWidth ? "mc-btn--block" : "mc-btn--inline", className]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </button>
  );
}
