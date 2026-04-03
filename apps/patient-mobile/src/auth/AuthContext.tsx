import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, type PropsWithChildren, useContext, useEffect, useMemo, useState } from "react";
import { getAuthMe, login, registerPatient } from "../api/client";
import type { AuthUser } from "../api/types";

const TOKEN_STORAGE_KEY = "patient-mobile.auth-token";

type AuthContextValue = {
  loading: boolean;
  token: string | null;
  user: AuthUser | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (params: { fullName: string; email: string; password: string; timezone?: string }) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider(props: PropsWithChildren) {
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

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
        setToken(storedToken);
        setUser(me.user);
      } catch {
        await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
        if (!alive) {
          return;
        }
        setToken(null);
        setUser(null);
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
        await AsyncStorage.setItem(TOKEN_STORAGE_KEY, response.token);
        setToken(response.token);
        setUser(response.user);
      },
      signUp: async (params: { fullName: string; email: string; password: string; timezone?: string }) => {
        const response = await registerPatient({
          email: params.email,
          password: params.password,
          fullName: params.fullName,
          timezone: params.timezone
        });
        await AsyncStorage.setItem(TOKEN_STORAGE_KEY, response.token);
        setToken(response.token);
        setUser(response.user);
      },
      signOut: async () => {
        await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
        setToken(null);
        setUser(null);
      }
    }),
    [loading, token, user]
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
