import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState
} from "react";
import { useLocation } from "react-router-dom";
import { type AppLanguage, textByLanguage } from "@therapy/i18n-config";
import { resolvePortalPageTitle } from "../lib/portalPageTitles";
import { useInAppBack } from "../hooks/useInAppBack";
import { ProPortalPageHeader } from "./ProPortalPageHeader";

export type ProPortalChromeConfig = {
  title?: string;
  titleId?: string;
  toolbar?: ReactNode;
  /** Si true, no se renderiza el header de página: el contenido lo embebe (p. ej. Dashboard). */
  suppressPageHeader?: boolean;
};

type ProPortalChromeContextValue = {
  setChrome: (config: ProPortalChromeConfig) => void;
  clearChrome: () => void;
  headerActions: ReactNode;
};

const ProPortalChromeContext = createContext<ProPortalChromeContextValue | null>(null);

function chromeEquals(a: ProPortalChromeConfig, b: ProPortalChromeConfig): boolean {
  return (
    a.title === b.title
    && a.titleId === b.titleId
    && a.toolbar === b.toolbar
    && a.suppressPageHeader === b.suppressPageHeader
  );
}

export function ProPortalChromeProvider(props: {
  language: AppLanguage;
  headerActions: ReactNode;
  children: ReactNode;
}) {
  const location = useLocation();
  const { canGoBack, goBack } = useInAppBack();
  const [override, setOverride] = useState<ProPortalChromeConfig>({});

  const setChrome = useCallback((config: ProPortalChromeConfig) => {
    setOverride((prev) => (chromeEquals(prev, config) ? prev : config));
  }, []);

  const clearChrome = useCallback(() => {
    setOverride((prev) => (Object.keys(prev).length === 0 ? prev : {}));
  }, []);

  const contextValue = useMemo(
    () => ({ setChrome, clearChrome, headerActions: props.headerActions }),
    [setChrome, clearChrome, props.headerActions]
  );

  const defaultTitle = useMemo(
    () => resolvePortalPageTitle(location.pathname, props.language),
    [location.pathname, props.language]
  );

  const title = override.title ?? defaultTitle;
  const suppressPageHeader = Boolean(override.suppressPageHeader);
  const backButton = canGoBack ? (
    <button type="button" className="in-app-back" onClick={goBack}>
      ← {textByLanguage(props.language, { es: "Volver", en: "Back", pt: "Voltar" })}
    </button>
  ) : null;

  return (
    <ProPortalChromeContext.Provider value={contextValue}>
      {!suppressPageHeader ? (
        <ProPortalPageHeader
          title={title}
          titleId={override.titleId}
          toolbar={override.toolbar}
          actions={props.headerActions}
          backButton={backButton}
        />
      ) : backButton ? (
        <div className="pro-portal-page-head pro-portal-page-head--back-only">{backButton}</div>
      ) : null}
      {props.children}
    </ProPortalChromeContext.Provider>
  );
}

export function useProPortalChrome(config: ProPortalChromeConfig) {
  const context = useContext(ProPortalChromeContext);
  if (!context) {
    throw new Error("useProPortalChrome must be used within ProPortalChromeProvider");
  }

  const { title, titleId, toolbar, suppressPageHeader } = config;

  const { setChrome, clearChrome } = context;

  useLayoutEffect(() => {
    setChrome({ title, titleId, toolbar, suppressPageHeader });
    return () => clearChrome();
  }, [setChrome, clearChrome, title, titleId, toolbar, suppressPageHeader]);
}

export function useProPortalHeaderActions(): ReactNode {
  const context = useContext(ProPortalChromeContext);
  if (!context) {
    throw new Error("useProPortalHeaderActions must be used within ProPortalChromeProvider");
  }
  return context.headerActions;
}
