import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState
} from "react";
import { useLocation } from "react-router-dom";
import { type AppLanguage } from "@therapy/i18n-config";
import { resolvePortalPageTitle } from "../lib/portalPageTitles";
import { ProPortalPageHeader } from "./ProPortalPageHeader";

export type ProPortalChromeConfig = {
  title?: string;
  titleId?: string;
  toolbar?: ReactNode;
};

type ProPortalChromeContextValue = {
  setChrome: (config: ProPortalChromeConfig) => void;
  clearChrome: () => void;
};

const ProPortalChromeContext = createContext<ProPortalChromeContextValue | null>(null);

function chromeEquals(a: ProPortalChromeConfig, b: ProPortalChromeConfig): boolean {
  return a.title === b.title && a.titleId === b.titleId && a.toolbar === b.toolbar;
}

export function ProPortalChromeProvider(props: {
  language: AppLanguage;
  headerActions: ReactNode;
  children: ReactNode;
}) {
  const location = useLocation();
  const [override, setOverride] = useState<ProPortalChromeConfig>({});

  useEffect(() => {
    setOverride({});
  }, [location.pathname]);

  const setChrome = useCallback((config: ProPortalChromeConfig) => {
    setOverride((prev) => (chromeEquals(prev, config) ? prev : config));
  }, []);

  const clearChrome = useCallback(() => {
    setOverride((prev) => (Object.keys(prev).length === 0 ? prev : {}));
  }, []);

  const contextValue = useMemo(
    () => ({ setChrome, clearChrome }),
    [setChrome, clearChrome]
  );

  const defaultTitle = useMemo(
    () => resolvePortalPageTitle(location.pathname, props.language),
    [location.pathname, props.language]
  );

  const title = override.title ?? defaultTitle;

  return (
    <ProPortalChromeContext.Provider value={contextValue}>
      <ProPortalPageHeader
        title={title}
        titleId={override.titleId}
        toolbar={override.toolbar}
        actions={props.headerActions}
      />
      {props.children}
    </ProPortalChromeContext.Provider>
  );
}

export function useProPortalChrome(config: ProPortalChromeConfig) {
  const context = useContext(ProPortalChromeContext);
  if (!context) {
    throw new Error("useProPortalChrome must be used within ProPortalChromeProvider");
  }

  const { title, titleId, toolbar } = config;

  const { setChrome, clearChrome } = context;

  useLayoutEffect(() => {
    setChrome({ title, titleId, toolbar });
    return () => clearChrome();
  }, [setChrome, clearChrome, title, titleId, toolbar]);
}
