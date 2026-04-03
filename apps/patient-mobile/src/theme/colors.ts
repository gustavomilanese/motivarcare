export const appColors = {
  background: "#F7F8FC",
  surface: "#FFFFFF",
  surfaceMuted: "#E8EDFF",
  primary: "#5F44EB",
  primaryDark: "#4329C7",
  primarySoft: "rgba(95, 68, 235, 0.12)",
  accent: "#22C55E",
  accentSoft: "rgba(34, 197, 94, 0.15)",
  warning: "#F59E0B",
  danger: "#EF4444",
  success: "#16A34A",
  text: "#111827",
  textMuted: "#475569",
  textSecond: "#334155",
  textSubtle: "#64748B",
  border: "#E2E8F0",
  surfacePressed: "#F1F5F9",
  glass: "rgba(255,255,255,0.72)",
  overlay: "rgba(15, 23, 42, 0.06)",
  /** Fondo raíz Inicio / scroll */
  homeCanvas: "#F1EEF9",
  /** Textos estilo “grupo iOS” */
  groupedLabel: "#1C1C1E",
  groupedSecondary: "#6D6D72",
  groupedTertiary: "#8E8E93",
  /** Base bajo gradiente MCare (anti-alias) */
  mcareOuterBase: "#CDBDF5",
  /** Botón ghost / bordes suaves sobre primary */
  ghostBorder: "rgba(95, 68, 235, 0.25)",
  /** Superficie botón danger (light) */
  dangerSurface: "#FEF2F2",
  dangerBorder: "#FECACA",
  /** Tab bar flotante */
  tabBarBg: "rgba(255,255,255,0.96)",
  tabBarShadow: "#0F172A"
};

export type AppThemeColors = typeof appColors;

/**
 * Referencia iOS “Inset Grouped” (clair) — útil para pantallas tipo Ajustes / Salud.
 * Textos: SF usa el sistema; en RN “System” se mapea a San Francisco en iPhone.
 */
/** @deprecated Preferir `colors.grouped*` desde `useThemeMode()` */
export const iosGrouped = {
  background: "#F2F2F7",
  cell: "#FFFFFF",
  cellPressed: "rgba(60, 60, 67, 0.06)",
  separator: "#C6C6C8",
  secondaryLabel: appColors.groupedSecondary,
  tertiaryLabel: appColors.groupedTertiary,
  chevron: "#C7C7CC",
  label: appColors.groupedLabel
} as const;

/** @deprecated Usar `colors.homeCanvas` desde `useThemeMode()` */
export const homeCanvas = appColors.homeCanvas;

export const appGradients = {
  hero: ["#5F44EB", "#7C6AFC", "#9D8CFF"] as const,
  card: ["#FFFFFF", "#F8FAFF"] as const,
  /** Saldo / plan — lavanda suave → blanco */
  planCard: ["#EEF2FF", "#F8FAFF", "#FFFFFF"] as const,
  /** MCare Plus — venta: violeta pastel (un poco más cargado que antes) */
  mcarePastel: ["#C4B5FD", "#D4C4FA", "#CDBDF5"] as const
};

/** Misma forma que `appGradients`, para modo oscuro */
export const appGradientsDark = {
  hero: ["#312e81", "#4c1d95", "#5b21b6"] as const,
  card: ["#0f172a", "#1e293b"] as const,
  planCard: ["#1e1b4b", "#0f172a", "#020617"] as const,
  mcarePastel: ["#4c3d8a", "#5b4a9e", "#4338a8"] as const
};
