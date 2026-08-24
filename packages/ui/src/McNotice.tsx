import type { HTMLAttributes, ReactNode } from "react";

type McNoticeTone = "error" | "success";

export function McNotice(
  props: HTMLAttributes<HTMLParagraphElement> & {
    tone?: McNoticeTone;
    children: ReactNode;
  }
) {
  const { tone = "error", className, children, role, ...rest } = props;
  return (
    <p
      {...rest}
      role={role ?? (tone === "error" ? "alert" : "status")}
      className={["mc-notice", `mc-notice--${tone}`, className].filter(Boolean).join(" ")}
    >
      {children}
    </p>
  );
}
