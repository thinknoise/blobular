export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export type AuthUser = {
  id: string;
  email: string;
  createdAt: string;
  authProvider: "local-dev";
};

export type AuthCredentials = {
  email: string;
  password: string;
};

export type AuthRegistration = AuthCredentials & {
  confirmPassword: string;
};
