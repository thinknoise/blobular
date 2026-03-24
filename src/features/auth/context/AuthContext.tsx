import {
  createContext,
  startTransition,
  useEffect,
  useMemo,
  useState,
} from "react";

import { BLOBULAR_AUTH_MODE } from "@/shared/config/appConfig";

import type {
  AuthCredentials,
  AuthPasswordReset,
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
import {
  clearModelglueSession,
  getCurrentModelglueUser,
  resetPasswordWithModelglueAuth,
  signInWithModelglueAuth,
  signUpWithModelglueAuth,
} from "../utils/modelglueAuthStore";

type AuthStore = {
  getCurrentUser: () => AuthUser | null;
  signIn: (credentials: AuthCredentials) => Promise<AuthUser> | AuthUser;
  signUp: (registration: AuthRegistration) => Promise<AuthUser> | AuthUser;
  resetPassword: (payload: AuthPasswordReset) => Promise<void>;
  clearSession: () => void;
};

const authStore: AuthStore =
  BLOBULAR_AUTH_MODE === "local-dev"
    ? {
        getCurrentUser,
        signIn: signInWithLocalAuth,
        signUp: signUpWithLocalAuth,
        resetPassword: async () => {
          throw new Error("Password reset is unavailable in local auth mode.");
        },
        clearSession,
      }
    : {
        getCurrentUser: getCurrentModelglueUser,
        signIn: signInWithModelglueAuth,
        signUp: signUpWithModelglueAuth,
        resetPassword: resetPasswordWithModelglueAuth,
        clearSession: clearModelglueSession,
      };

type AuthContextValue = {
  status: AuthStatus;
  user: AuthUser | null;
  signIn: (credentials: AuthCredentials) => Promise<void>;
  signUp: (registration: AuthRegistration) => Promise<void>;
  resetPassword: (payload: AuthPasswordReset) => Promise<void>;
  signOut: () => void;
};

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined
);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const currentUser = authStore.getCurrentUser();
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
        const nextUser = await authStore.signIn(credentials);
        startTransition(() => {
          setUser(nextUser);
          setStatus("authenticated");
        });
      },
      signUp: async (registration) => {
        const nextUser = await authStore.signUp(registration);
        startTransition(() => {
          setUser(nextUser);
          setStatus("authenticated");
        });
      },
      resetPassword: async (payload) => {
        await authStore.resetPassword(payload);
      },
      signOut: () => {
        authStore.clearSession();
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
