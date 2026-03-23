import {
  createContext,
  startTransition,
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  AuthCredentials,
  AuthRegistration,
  AuthStatus,
  AuthUser,
} from "../types";
import {
  clearSession,
  getCurrentUser,
  signInWithLocalAuth,
  signUpWithLocalAuth,
} from "../utils/localAuthStore";

type AuthContextValue = {
  status: AuthStatus;
  user: AuthUser | null;
  signIn: (credentials: AuthCredentials) => Promise<void>;
  signUp: (registration: AuthRegistration) => Promise<void>;
  signOut: () => void;
};

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined
);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const currentUser = getCurrentUser();
    startTransition(() => {
      setUser(currentUser);
      setStatus(currentUser ? "authenticated" : "unauthenticated");
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      signIn: async (credentials) => {
        const nextUser = signInWithLocalAuth(credentials);
        startTransition(() => {
          setUser(nextUser);
          setStatus("authenticated");
        });
      },
      signUp: async (registration) => {
        const nextUser = signUpWithLocalAuth(registration);
        startTransition(() => {
          setUser(nextUser);
          setStatus("authenticated");
        });
      },
      signOut: () => {
        clearSession();
        startTransition(() => {
          setUser(null);
          setStatus("unauthenticated");
        });
      },
    }),
    [status, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
