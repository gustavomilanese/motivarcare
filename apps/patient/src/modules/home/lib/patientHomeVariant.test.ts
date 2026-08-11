import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  PATIENT_HOME_VARIANT_EVENT,
  PATIENT_HOME_VARIANT_STORAGE_KEY,
  isPatientHomeMlShellPath,
  readPatientHomeVariant,
  resolveHomeView,
  setPatientHomeVariant,
  shouldUsePatientHomeMlChrome,
  writePatientHomeVariant
} from "./patientHomeVariant";

function installBrowserGlobals(): void {
  const store = new Map<string, string>();
  const localStorageMock = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    }
  };

  const listeners = new Map<string, Set<EventListener>>();
  const windowMock = {
    localStorage: localStorageMock,
    addEventListener: (type: string, listener: EventListener) => {
      const set = listeners.get(type) ?? new Set();
      set.add(listener);
      listeners.set(type, set);
    },
    removeEventListener: (type: string, listener: EventListener) => {
      listeners.get(type)?.delete(listener);
    },
    dispatchEvent: (event: Event) => {
      const set = listeners.get(event.type);
      if (!set) {
        return true;
      }
      for (const listener of set) {
        listener(event);
      }
      return true;
    }
  };

  vi.stubGlobal("window", windowMock);
  vi.stubGlobal("localStorage", localStorageMock);
}

describe("patientHomeVariant", () => {
  beforeEach(() => {
    installBrowserGlobals();
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("defaults to next (ML) when nothing is stored", () => {
    expect(readPatientHomeVariant()).toBe("next");
    expect(resolveHomeView(readPatientHomeVariant())).toBe("ml");
  });

  it("ignores invalid stored values and stays on next", () => {
    localStorage.setItem(PATIENT_HOME_VARIANT_STORAGE_KEY, "legacy");
    expect(readPatientHomeVariant()).toBe("next");
  });

  it("persists classic and next", () => {
    writePatientHomeVariant("classic");
    expect(localStorage.getItem(PATIENT_HOME_VARIANT_STORAGE_KEY)).toBe("classic");
    expect(readPatientHomeVariant()).toBe("classic");
    expect(resolveHomeView("classic")).toBe("classic");

    writePatientHomeVariant("next");
    expect(readPatientHomeVariant()).toBe("next");
    expect(resolveHomeView("next")).toBe("ml");
  });

  it("setPatientHomeVariant writes and dispatches the sync event", () => {
    const handler = vi.fn();
    window.addEventListener(PATIENT_HOME_VARIANT_EVENT, handler);
    setPatientHomeVariant("classic");
    expect(readPatientHomeVariant()).toBe("classic");
    expect(handler).toHaveBeenCalledTimes(1);
    window.removeEventListener(PATIENT_HOME_VARIANT_EVENT, handler);
  });
});

describe("isPatientHomeMlShellPath", () => {
  it("covers portal shell routes and rejects unrelated paths", () => {
    expect(isPatientHomeMlShellPath("/")).toBe(true);
    expect(isPatientHomeMlShellPath("/sessions")).toBe(true);
    expect(isPatientHomeMlShellPath("/chat")).toBe(true);
    expect(isPatientHomeMlShellPath("/diario")).toBe(true);
    expect(isPatientHomeMlShellPath("/diario/nueva")).toBe(true);
    expect(isPatientHomeMlShellPath("/ejercicios")).toBe(true);
    expect(isPatientHomeMlShellPath("/bienestar/musica")).toBe(true);
    expect(isPatientHomeMlShellPath("/profile")).toBe(true);
    expect(isPatientHomeMlShellPath("/profesionales")).toBe(true);

    expect(isPatientHomeMlShellPath("/matching")).toBe(false);
    expect(isPatientHomeMlShellPath("/book/trial")).toBe(false);
    expect(isPatientHomeMlShellPath("/onboarding/final/matching")).toBe(false);
  });
});

describe("shouldUsePatientHomeMlChrome", () => {
  it("enables ML chrome only for next + desktop + shell path", () => {
    expect(
      shouldUsePatientHomeMlChrome({
        isMobilePortal: false,
        homeVariant: "next",
        pathname: "/"
      })
    ).toBe(true);

    expect(
      shouldUsePatientHomeMlChrome({
        isMobilePortal: false,
        homeVariant: "next",
        pathname: "/sessions"
      })
    ).toBe(true);
  });

  it("disables ML chrome for classic (no mix with rail/top ML)", () => {
    expect(
      shouldUsePatientHomeMlChrome({
        isMobilePortal: false,
        homeVariant: "classic",
        pathname: "/"
      })
    ).toBe(false);

    expect(
      shouldUsePatientHomeMlChrome({
        isMobilePortal: false,
        homeVariant: "classic",
        pathname: "/sessions"
      })
    ).toBe(false);
  });

  it("disables ML chrome on mobile even when variant is next", () => {
    expect(
      shouldUsePatientHomeMlChrome({
        isMobilePortal: true,
        homeVariant: "next",
        pathname: "/"
      })
    ).toBe(false);
  });

  it("disables ML chrome outside shell paths", () => {
    expect(
      shouldUsePatientHomeMlChrome({
        isMobilePortal: false,
        homeVariant: "next",
        pathname: "/book/trial"
      })
    ).toBe(false);
  });
});
