export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export type AuthProviderName = "local-dev" | "modelglue-db";

export type AuthUser = {
  id: string;
  userId: number | null;
  email: string;
  createdAt: string;
  authProvider: AuthProviderName;
};

export type AuthCredentials = {
  email: string;
  password: string;
  rememberMe?: boolean;
};

export type AuthRegistration = AuthCredentials & {
  confirmPassword: string;
};

export type AuthPasswordReset = {
  email: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};
