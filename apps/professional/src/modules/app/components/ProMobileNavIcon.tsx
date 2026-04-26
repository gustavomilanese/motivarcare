import type { PortalSection } from "../types";

const iconProps = {
  className: "pro-mobile-nav-icon",
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true as const
};

export function ProMobileNavIcon(props: { section: PortalSection }) {
  switch (props.section) {
    case "/":
      return (
        <svg {...iconProps}>
          <path d="M3 9.5 12 4l9 5.5V20a1 1 0 0 1-1 1h-5v-8H9v8H4a1 1 0 0 1-1-1V9.5Z" />
        </svg>
      );
    case "/horarios":
      return (
        <svg {...iconProps}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M16 3v4M8 3v4M3 11h18" />
        </svg>
      );
    case "/disponibilidad":
      return (
        <svg {...iconProps}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      );
    case "/pacientes":
      return (
        <svg {...iconProps}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "/chat":
      return (
        <svg {...iconProps}>
          <path d="M21 12a7 7 0 0 1-7 7H8l-5 3v-3a7 7 0 1 1 18-7Z" />
        </svg>
      );
    case "/reportes":
      return (
        <svg {...iconProps}>
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
          <path d="M14 3v5h5" />
          <path d="M9 13h6M9 17h6" />
        </svg>
      );
    case "/ingresos":
      return (
        <svg {...iconProps}>
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      );
    case "/agenda/ajustes":
      return (
        <svg {...iconProps}>
          <path d="M4.5 7.5H14.5" />
          <path d="M4.5 16.5H10.5" />
          <circle cx="17" cy="7.5" r="2.5" />
          <circle cx="13" cy="16.5" r="2.5" />
        </svg>
      );
    default:
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="12" r="10" />
        </svg>
      );
  }
}
