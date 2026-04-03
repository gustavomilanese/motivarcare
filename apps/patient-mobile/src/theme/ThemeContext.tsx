import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import {
  appColors as lightColors,
  appGradients,
  appGradientsDark,
  type AppThemeColors
} from "./colors";

const THEME_STORAGE_KEY = "patient-mobile.theme-mode";

export type ThemeMode = "light" | "dark";

export type AppGradients = typeof appGradients;

type ThemeContextValue = {
  mode: ThemeMode;
  colors: AppThemeColors;
  gradients: AppGradients;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const darkColors: AppThemeColors = {
  ...lightColors,
  background: "#020617",
  surface: "#0f172a",
  surfaceMuted: "#1e293b",
  primarySoft: "rgba(167, 139, 250, 0.22)",
  accentSoft: "rgba(34, 197, 94, 0.12)",
  text: "#F9FAFB",
  textMuted: "#CBD5E1",
  textSecond: "#E2E8F0",
  textSubtle: "#94A3B8",
  border: "#334155",
  surfacePressed: "#1e293b",
  glass: "rgba(15, 23, 42, 0.88)",
  overlay: "rgba(0, 0, 0, 0.45)",
  homeCanvas: "#020617",
  groupedLabel: "#F4F4F5",
  groupedSecondary: "#A1A1AA",
  groupedTertiary: "#71717A",
  mcareOuterBase: "#312e5a",
  ghostBorder: "rgba(196, 181, 253, 0.35)",
  dangerSurface: "rgba(127, 29, 29, 0.28)",
  dangerBorder: "rgba(248, 113, 113, 0.45)",
  tabBarBg: "rgba(15, 23, 42, 0.94)",
  tabBarShadow: "#000000"
};

export function ThemeProvider(props: PropsWithChildren) {
  const [mode, setMode] = useState<ThemeMode>("light");
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    let alive = true;

    const restore = async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (!alive || !stored) {
          setRestored(true);
          return;
        }
        if (stored === "light" || stored === "dark") {
          setMode(stored);
        }
      } finally {
        if (alive) {
          setRestored(true);
        }
      }
    };

    void restore();
    return () => {
      alive = false;
    };
  }, []);

  const updateMode = useCallback((next: ThemeMode) => {
    setMode(next);
    void AsyncStorage.setItem(THEME_STORAGE_KEY, next);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      colors: mode === "dark" ? darkColors : lightColors,
      gradients: (mode === "dark" ? appGradientsDark : appGradients) as AppGradients,
      setMode: updateMode,
      toggle: () => {
        updateMode(mode === "dark" ? "light" : "dark");
      }
    }),
    [mode, updateMode]
  );

  if (!restored) {
    return null;
  }

  return <ThemeContext.Provider value={value}>{props.children}</ThemeContext.Provider>;
}

export function useThemeMode() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useThemeMode must be used within ThemeProvider");
  }
  return ctx;
}
