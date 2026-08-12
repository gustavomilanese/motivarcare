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
import {
  getAuthMe,
  login,
  registerPatient,
  setApiUnauthorizedHandler,
  verifyEmailToken
} from "../api/client";
import type { AuthUser } from "../api/types";

const TOKEN_STORAGE_KEY = "patient-mobile.auth-token";

type AuthContextValue = {
  loading: boolean;
  token: string | null;
  user: AuthUser | null;
  /** Server says patients must verify before using the portal. */
  emailVerificationRequired: boolean;
  needsEmailVerification: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (params: {
    fullName: string;
    email: string;
    password: string;
    timezone?: string;
    residencyCountry: string;
  }) => Promise<void>;
  signOut: () => Promise<void>;
  completeEmailVerification: (params: {
    token: string;
    user: AuthUser;
    emailVerificationRequired: boolean;
  }) => Promise<void>;
  refreshAuthMe: () => Promise<void>;
  applyVerifyEmailLink: (emailToken: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider(props: PropsWithChildren) {
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [emailVerificationRequired, setEmailVerificationRequired] = useState(false);
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
      setEmailVerificationRequired(false);
    } finally {
      signingOutRef.current = false;
    }
  }, []);

  useEffect(() => {
    setApiUnauthorizedHandler(() => {
      void clearSession();
    });
    return () => {
      setApiUnauthorizedHandler(undefined);
    };
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
        setToken(storedToken);
        setUser(me.user);
        setEmailVerificationRequired(Boolean(me.emailVerificationRequired));
      } catch {
        await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
        if (!alive) {
          return;
        }
        setToken(null);
        setUser(null);
        setEmailVerificationRequired(false);
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

  const needsEmailVerification =
    Boolean(token)
    && emailVerificationRequired
    && user != null
    && user.emailVerified === false;

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      token,
      user,
      emailVerificationRequired,
      needsEmailVerification,
      signIn: async (email, password) => {
        const response = await login({ email: email.trim().toLowerCase(), password });
        await AsyncStorage.setItem(TOKEN_STORAGE_KEY, response.token);
        setToken(response.token);
        setUser(response.user);
        setEmailVerificationRequired(Boolean(response.emailVerificationRequired));
      },
      signUp: async (params) => {
        const response = await registerPatient({
          email: params.email,
          password: params.password,
          fullName: params.fullName,
          timezone: params.timezone,
          residencyCountry: params.residencyCountry
        });
        await AsyncStorage.setItem(TOKEN_STORAGE_KEY, response.token);
        setToken(response.token);
        setUser(response.user);
        setEmailVerificationRequired(Boolean(response.emailVerificationRequired));
      },
      signOut: clearSession,
      completeEmailVerification: async (params) => {
        await AsyncStorage.setItem(TOKEN_STORAGE_KEY, params.token);
        setToken(params.token);
        setUser(params.user);
        setEmailVerificationRequired(Boolean(params.emailVerificationRequired));
      },
      refreshAuthMe: async () => {
        if (!token) {
          return;
        }
        const me = await getAuthMe(token);
        setUser(me.user);
        setEmailVerificationRequired(Boolean(me.emailVerificationRequired));
      },
      applyVerifyEmailLink: async (emailToken) => {
        const data = await verifyEmailToken(emailToken);
        if (typeof data.token === "string" && data.token.length > 0 && data.user?.role === "PATIENT") {
          await AsyncStorage.setItem(TOKEN_STORAGE_KEY, data.token);
          setToken(data.token);
          setUser(data.user);
          setEmailVerificationRequired(Boolean(data.emailVerificationRequired));
          return;
        }
        if (token) {
          const me = await getAuthMe(token);
          setUser(me.user);
          setEmailVerificationRequired(Boolean(me.emailVerificationRequired));
        }
      }
    }),
    [loading, token, user, emailVerificationRequired, needsEmailVerification, clearSession]
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
