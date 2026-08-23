import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { getAuthMe, login, setApiUnauthorizedHandler } from "../api/client";
import type { AuthUser } from "../api/types";

const TOKEN_STORAGE_KEY = "professional-mobile.auth-token";

type AuthContextValue = {
  loading: boolean;
  token: string | null;
  user: AuthUser | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider(props: PropsWithChildren) {
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const signingOutRef = useRef(false);

  const clearSession = useCallback(async () => {
    if (signingOutRef.current) {
      return;
    }
    signingOutRef.current = true;
    try {
      await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
      setToken(null);
      setUser(null);
    } finally {
      signingOutRef.current = false;
    }
  }, []);

  useEffect(() => {
    setApiUnauthorizedHandler(() => {
      void clearSession();
    });
    return () => setApiUnauthorizedHandler(undefined);
  }, [clearSession]);

  useEffect(() => {
    let alive = true;
    const restore = async () => {
      try {
        const storedToken = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
        if (!storedToken) {
          if (alive) {
            setLoading(false);
          }
          return;
        }
        const me = await getAuthMe(storedToken);
        if (!alive) {
          return;
        }
        if (me.user.role !== "PROFESSIONAL") {
          await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
          setToken(null);
          setUser(null);
          return;
        }
        setToken(storedToken);
        setUser(me.user);
      } catch {
        await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
        if (alive) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    };
    void restore();
    return () => {
      alive = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      token,
      user,
      signIn: async (email, password) => {
        const response = await login({ email: email.trim().toLowerCase(), password });
        if (response.user.role !== "PROFESSIONAL") {
          throw new Error("Esta app es para profesionales. Entrá con una cuenta de consultorio.");
        }
        await AsyncStorage.setItem(TOKEN_STORAGE_KEY, response.token);
        setToken(response.token);
        setUser(response.user);
      },
      signOut: clearSession
    }),
    [loading, token, user, clearSession]
  );

  return <AuthContext.Provider value={value}>{props.children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
