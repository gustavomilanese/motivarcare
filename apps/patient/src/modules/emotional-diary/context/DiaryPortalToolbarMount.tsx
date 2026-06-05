import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type DiaryPortalToolbarMountContextValue = {
  mount: HTMLElement | null;
  setMount: (el: HTMLElement | null) => void;
};

const DiaryPortalToolbarMountContext = createContext<DiaryPortalToolbarMountContextValue | null>(null);

export function DiaryPortalToolbarMountProvider(props: { children: ReactNode }) {
  const [mount, setMountState] = useState<HTMLElement | null>(null);
  const setMount = useCallback((el: HTMLElement | null) => {
    setMountState(el);
  }, []);
  const value = useMemo(() => ({ mount, setMount }), [mount, setMount]);

  return <DiaryPortalToolbarMountContext.Provider value={value}>{props.children}</DiaryPortalToolbarMountContext.Provider>;
}

export function useDiaryPortalToolbarMountElement() {
  return useContext(DiaryPortalToolbarMountContext)?.mount ?? null;
}

export function useDiaryPortalToolbarMountTarget() {
  return useContext(DiaryPortalToolbarMountContext)?.setMount ?? (() => {});
}
