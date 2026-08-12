import { useId, useState } from "react";

export type BenefitIconKind =
  | "professional"
  | "book"
  | "buy"
  | "upcoming"
  | "packages"
  | "history"
  | "activity"
  | "diary"
  | "music"
  | "exercises";

const BENEFIT_ICON_SRC: Partial<Record<BenefitIconKind, string>> = {
  packages: "/home/cards/packages-cut.png",
  history: "/home/cards/history-cut.png",
  activity: "/home/cards/activity-cut.png",
  professional: "/home/cards/professional-cut.png"
};

/** Fallback premium SVG si el cutout aún no está disponible. */
function BenefitIconFallback(props: { kind: BenefitIconKind; gid: string }) {
  const gid = props.gid;
  const common = {
    viewBox: "0 0 64 64",
    width: 64,
    height: 64,
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    "aria-hidden": true as const,
    className: "dashboard-ml-benefit-icon-svg"
  };

  switch (props.kind) {
    case "professional":
      return (
        <svg {...common}>
          <defs>
            <linearGradient id={`${gid}-a`} x1="12" y1="8" x2="54" y2="56" gradientUnits="userSpaceOnUse">
              <stop stopColor="#ede9fe" />
              <stop offset="1" stopColor="#c4b5fd" />
            </linearGradient>
            <linearGradient id={`${gid}-b`} x1="22" y1="14" x2="42" y2="52" gradientUnits="userSpaceOnUse">
              <stop stopColor="#7c6aef" />
              <stop offset="1" stopColor="#4c31d8" />
            </linearGradient>
          </defs>
          <circle cx="32" cy="32" r="28" fill={`url(#${gid}-a)`} />
          <circle cx="32" cy="24" r="9" fill={`url(#${gid}-b)`} />
          <path d="M16 48c3.8-9.2 11.4-13.2 16-13.2S44.2 38.8 48 48" fill={`url(#${gid}-b)`} />
          <circle cx="46" cy="18" r="5.5" fill="#a78bfa" />
          <path d="M44 18h4M46 16v4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case "buy":
      return (
        <svg {...common}>
          <defs>
            <linearGradient id={`${gid}-a`} x1="10" y1="8" x2="54" y2="56" gradientUnits="userSpaceOnUse">
              <stop stopColor="#ffffff" stopOpacity="0.28" />
              <stop offset="1" stopColor="#ffffff" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          <circle cx="32" cy="32" r="28" fill={`url(#${gid}-a)`} />
          <path d="M32 18v28M18 32h28" stroke="#fff" strokeWidth="5.5" strokeLinecap="round" />
        </svg>
      );
    case "book":
      return (
        <svg {...common}>
          <defs>
            <linearGradient id={`${gid}-a`} x1="10" y1="8" x2="54" y2="56" gradientUnits="userSpaceOnUse">
              <stop stopColor="#ffffff" stopOpacity="0.28" />
              <stop offset="1" stopColor="#ffffff" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          <circle cx="32" cy="32" r="28" fill={`url(#${gid}-a)`} />
          <rect x="17" y="19" width="30" height="28" rx="7" fill="#fff" fillOpacity="0.95" />
          <path d="M17 28h30" stroke="#2563eb" strokeWidth="2.4" opacity="0.9" />
          <path d="M24 15.5v7M40 15.5v7" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" />
          <rect x="23" y="33" width="7" height="7" rx="2" fill="#1d4ed8" />
          <rect x="34" y="33" width="7" height="7" rx="2" fill="#93c5fd" />
        </svg>
      );
    case "upcoming":
      return (
        <svg {...common}>
          <defs>
            <linearGradient id={`${gid}-a`} x1="10" y1="8" x2="54" y2="56" gradientUnits="userSpaceOnUse">
              <stop stopColor="#dbeafe" />
              <stop offset="1" stopColor="#bfdbfe" />
            </linearGradient>
            <linearGradient id={`${gid}-b`} x1="18" y1="14" x2="46" y2="50" gradientUnits="userSpaceOnUse">
              <stop stopColor="#3b82f6" />
              <stop offset="1" stopColor="#1d4ed8" />
            </linearGradient>
          </defs>
          <circle cx="32" cy="32" r="28" fill={`url(#${gid}-a)`} />
          <rect x="17" y="19" width="30" height="28" rx="7" fill={`url(#${gid}-b)`} />
          <path d="M17 28h30" stroke="#fff" strokeWidth="2.4" opacity="0.9" />
          <path d="M24 15.5v7M40 15.5v7" stroke={`url(#${gid}-b)`} strokeWidth="3.2" strokeLinecap="round" />
          <rect x="23" y="33" width="7" height="7" rx="2" fill="#fff" />
          <rect x="34" y="33" width="7" height="7" rx="2" fill="#93c5fd" />
        </svg>
      );
    case "packages":
      return (
        <svg {...common}>
          <defs>
            <linearGradient id={`${gid}-a`} x1="10" y1="8" x2="54" y2="56" gradientUnits="userSpaceOnUse">
              <stop stopColor="#ede9fe" />
              <stop offset="1" stopColor="#c4b5fd" />
            </linearGradient>
            <linearGradient id={`${gid}-b`} x1="18" y1="18" x2="46" y2="48" gradientUnits="userSpaceOnUse">
              <stop stopColor="#7c6aef" />
              <stop offset="1" stopColor="#4c31d8" />
            </linearGradient>
          </defs>
          <circle cx="32" cy="32" r="28" fill={`url(#${gid}-a)`} />
          <path d="M18 28l14-8 14 8v16l-14 8-14-8V28z" fill={`url(#${gid}-b)`} />
          <path d="M32 20v32M18 28l14 8 14-8" stroke="#ede9fe" strokeWidth="2" opacity="0.85" />
        </svg>
      );
    case "history":
      return (
        <svg {...common}>
          <defs>
            <linearGradient id={`${gid}-a`} x1="10" y1="8" x2="54" y2="56" gradientUnits="userSpaceOnUse">
              <stop stopColor="#ede9fe" />
              <stop offset="1" stopColor="#c4b5fd" />
            </linearGradient>
          </defs>
          <circle cx="32" cy="32" r="28" fill={`url(#${gid}-a)`} />
          <circle cx="32" cy="32" r="14" fill="#fff" />
          <circle cx="32" cy="32" r="14" stroke="#5f44eb" strokeWidth="2.4" />
          <path d="M32 22v11l8 5" stroke="#5f44eb" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "activity":
      return (
        <svg {...common}>
          <defs>
            <linearGradient id={`${gid}-a`} x1="10" y1="8" x2="54" y2="56" gradientUnits="userSpaceOnUse">
              <stop stopColor="#ede9fe" />
              <stop offset="1" stopColor="#c4b5fd" />
            </linearGradient>
          </defs>
          <circle cx="32" cy="32" r="28" fill={`url(#${gid}-a)`} />
          <rect x="20" y="16" width="24" height="32" rx="6" fill="#fff" />
          <path d="M26 26h12M26 33h12M26 40h8" stroke="#5f44eb" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="44" cy="44" r="7" fill="#5f44eb" />
          <path d="M41.5 44h5M44 41.5v5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "diary":
      return (
        <svg {...common}>
          <defs>
            <linearGradient id={`${gid}-a`} x1="10" y1="8" x2="54" y2="56" gradientUnits="userSpaceOnUse">
              <stop stopColor="#ede9fe" />
              <stop offset="1" stopColor="#c4b5fd" />
            </linearGradient>
            <linearGradient id={`${gid}-b`} x1="18" y1="14" x2="46" y2="52" gradientUnits="userSpaceOnUse">
              <stop stopColor="#7c6aef" />
              <stop offset="1" stopColor="#4c31d8" />
            </linearGradient>
          </defs>
          <circle cx="32" cy="32" r="28" fill={`url(#${gid}-a)`} />
          <rect x="18" y="14" width="28" height="36" rx="6" fill={`url(#${gid}-b)`} />
          <rect x="22" y="18" width="20" height="28" rx="3" fill="#fff" />
          <path d="M26 26h12M26 32h12M26 38h8" stroke="#5f44eb" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="44" cy="18" r="5.5" fill="#a78bfa" />
        </svg>
      );
    case "music":
      return (
        <svg {...common}>
          <defs>
            <linearGradient id={`${gid}-a`} x1="10" y1="8" x2="54" y2="56" gradientUnits="userSpaceOnUse">
              <stop stopColor="#dcfce7" />
              <stop offset="1" stopColor="#86efac" />
            </linearGradient>
            <linearGradient id={`${gid}-b`} x1="18" y1="16" x2="48" y2="50" gradientUnits="userSpaceOnUse">
              <stop stopColor="#22c55e" />
              <stop offset="1" stopColor="#15803d" />
            </linearGradient>
          </defs>
          <circle cx="32" cy="32" r="28" fill={`url(#${gid}-a)`} />
          <path
            d="M26 42V22l20-4v20"
            stroke={`url(#${gid}-b)`}
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="22" cy="42" r="6" fill={`url(#${gid}-b)`} />
          <circle cx="42" cy="38" r="6" fill={`url(#${gid}-b)`} />
        </svg>
      );
    case "exercises":
      return (
        <svg {...common}>
          <defs>
            <linearGradient id={`${gid}-a`} x1="10" y1="8" x2="54" y2="56" gradientUnits="userSpaceOnUse">
              <stop stopColor="#f3e8ff" />
              <stop offset="1" stopColor="#e9d5ff" />
            </linearGradient>
            <linearGradient id={`${gid}-b`} x1="16" y1="18" x2="48" y2="48" gradientUnits="userSpaceOnUse">
              <stop stopColor="#a855f7" />
              <stop offset="1" stopColor="#7e22ce" />
            </linearGradient>
          </defs>
          <circle cx="32" cy="32" r="28" fill={`url(#${gid}-a)`} />
          <path
            d="M20 40c4-10 8-16 12-16s8 6 12 16"
            stroke={`url(#${gid}-b)`}
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="32" cy="20" r="5" fill={`url(#${gid}-b)`} />
          <path d="M18 28h8M38 28h8" stroke={`url(#${gid}-b)`} strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
}

export function BenefitIcon(props: { kind: BenefitIconKind }) {
  const [failed, setFailed] = useState(false);
  const uid = useId().replace(/:/g, "");
  const src = BENEFIT_ICON_SRC[props.kind];
  const gid = `ml-ic-${props.kind}-${uid}`;

  if (!src || failed) {
    return <BenefitIconFallback kind={props.kind} gid={gid} />;
  }

  return (
    <img
      className="dashboard-ml-benefit-icon-img"
      src={src}
      alt=""
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}

