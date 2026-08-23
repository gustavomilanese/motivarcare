import { createContext, type PropsWithChildren, useContext, useMemo, useState } from "react";

type ChromeValue = {
  drawerOpen: boolean;
  tabBarHidden: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  setTabBarHidden: (hidden: boolean) => void;
};

const ChromeContext = createContext<ChromeValue | null>(null);

export function ChromeProvider(props: PropsWithChildren) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [tabBarHidden, setTabBarHidden] = useState(false);
  const value = useMemo<ChromeValue>(
    () => ({
      drawerOpen,
      tabBarHidden,
      openDrawer: () => setDrawerOpen(true),
      closeDrawer: () => setDrawerOpen(false),
      setTabBarHidden
    }),
    [drawerOpen, tabBarHidden]
  );
  return <ChromeContext.Provider value={value}>{props.children}</ChromeContext.Provider>;
}

export function useChrome() {
  const ctx = useContext(ChromeContext);
  if (!ctx) {
    throw new Error("useChrome must be used inside ChromeProvider");
  }
  return ctx;
}
