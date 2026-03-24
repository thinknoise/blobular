import { resolveAuthApiUrl } from "@/shared/config/appConfig";

import type {
  AuthCredentials,
  AuthPasswordReset,
  AuthRegistration,
  AuthUser,
} from "../types";
import {
  allPasswordChecksMet,
  getPasswordChecks,
  isValidEmail,
  normalizeEmail,
} from "./authValidation";

type ApiResponse = {
  ok?: boolean;
  message?: string;
};

type LoginApiResponse = ApiResponse & {
  userId?: number;
};

type CreateUserApiResponse = ApiResponse & {
  userId?: number;
};

type RememberedSession = {
  expiresAt: number;
  user: AuthUser;
};

const SESSION_KEY = "blobular.auth.session.v1";
const REMEMBER_KEY = "blobular.auth.remember.v1";
const REMEMBER_WINDOW_MS = 48 * 60 * 60 * 1000;

function parseAuthUser(rawUser: unknown): AuthUser | null {
  if (!rawUser || typeof rawUser !== "object") {
    return null;
  }

  const parsed = rawUser as Partial<AuthUser>;
  if (
    typeof parsed.id !== "string" ||
    typeof parsed.email !== "string" ||
    typeof parsed.createdAt !== "string" ||
    parsed.authProvider !== "modelglue-db"
  ) {
    return null;
  }

  const userId = Number(parsed.userId);
  if (!Number.isFinite(userId) || userId <= 0) {
    return null;
  }

  return {
    id: parsed.id,
    userId: Math.trunc(userId),
    email: normalizeEmail(parsed.email),
    createdAt: parsed.createdAt,
    authProvider: "modelglue-db",
  };
}

function readSession(storageKey: string, storage: Storage): AuthUser | null {
  try {
    const raw = storage.getItem(storageKey);
    return raw ? parseAuthUser(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function writeSession(user: AuthUser, rememberMe: boolean): void {
  window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));

  if (!rememberMe) {
    window.localStorage.removeItem(REMEMBER_KEY);
    return;
  }

  const remembered: RememberedSession = {
    expiresAt: Date.now() + REMEMBER_WINDOW_MS,
    user,
  };
  window.localStorage.setItem(REMEMBER_KEY, JSON.stringify(remembered));
}

function restoreRememberedSession(): AuthUser | null {
  try {
    const raw = window.localStorage.getItem(REMEMBER_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<RememberedSession>;
    if (
      typeof parsed.expiresAt !== "number" ||
      !Number.isFinite(parsed.expiresAt) ||
      parsed.expiresAt <= Date.now() ||
      !parsed.user
    ) {
      window.localStorage.removeItem(REMEMBER_KEY);
      return null;
    }

    const user = parseAuthUser(parsed.user);
    if (!user) {
      window.localStorage.removeItem(REMEMBER_KEY);
      return null;
    }

    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
    return user;
  } catch {
    window.localStorage.removeItem(REMEMBER_KEY);
    return null;
  }
}

function makeAuthUser(email: string, userId: number): AuthUser {
  const normalizedEmail = normalizeEmail(email);

  return {
    id: String(Math.trunc(userId)),
    userId: Math.trunc(userId),
    email: normalizedEmail,
    createdAt: new Date().toISOString(),
    authProvider: "modelglue-db",
  };
}

async function postJson<T extends ApiResponse>(
  path: string,
  payload: unknown
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(resolveAuthApiUrl(path), {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error("Unable to reach the Modelglue account service.");
  }

  const data = (await response.json().catch(() => ({}))) as T;

  if (!response.ok) {
    return {
      ...data,
      ok: false,
      message: data.message ?? "Request failed.",
    };
  }

  return data;
}

export function getCurrentModelglueUser(): AuthUser | null {
  return readSession(SESSION_KEY, window.sessionStorage) ?? restoreRememberedSession();
}

export function clearModelglueSession(): void {
  window.sessionStorage.removeItem(SESSION_KEY);
  window.localStorage.removeItem(REMEMBER_KEY);
}

export async function signInWithModelglueAuth({
  email,
  password,
  rememberMe = false,
}: AuthCredentials): Promise<AuthUser> {
  const normalizedEmail = normalizeEmail(email);
  const trimmedPassword = password.trim();

  if (!isValidEmail(normalizedEmail)) {
    throw new Error("Enter a valid email address.");
  }

  if (!trimmedPassword) {
    throw new Error("Password is required.");
  }

  const result = await postJson<LoginApiResponse>("login-user.php", {
    email: normalizedEmail,
    password: trimmedPassword,
  });

  if (!result.ok) {
    throw new Error(result.message ?? "Invalid email or password.");
  }

  const userId = Number(result.userId);
  if (!Number.isFinite(userId) || userId <= 0) {
    throw new Error("Login response is missing a valid user id.");
  }

  const user = makeAuthUser(normalizedEmail, userId);
  writeSession(user, rememberMe);

  return user;
}

export async function signUpWithModelglueAuth({
  email,
  password,
  confirmPassword,
}: AuthRegistration): Promise<AuthUser> {
  const normalizedEmail = normalizeEmail(email);
  const trimmedPassword = password.trim();

  if (!isValidEmail(normalizedEmail)) {
    throw new Error("Enter a valid email address.");
  }

  if (!allPasswordChecksMet(getPasswordChecks(trimmedPassword))) {
    throw new Error(
      "Password must be at least 8 chars and include one number and one special character."
    );
  }

  if (trimmedPassword !== confirmPassword.trim()) {
    throw new Error("Passwords do not match.");
  }

  const result = await postJson<CreateUserApiResponse>("create-user.php", {
    email: normalizedEmail,
    password: trimmedPassword,
  });

  if (!result.ok) {
    throw new Error(result.message ?? "Unable to create account.");
  }

  const userId = Number(result.userId);
  if (!Number.isFinite(userId) || userId <= 0) {
    throw new Error("Create account response is missing a valid user id.");
  }

  const user = makeAuthUser(normalizedEmail, userId);
  writeSession(user, false);

  return user;
}

export async function resetPasswordWithModelglueAuth({
  email,
  currentPassword,
  newPassword,
  confirmPassword,
}: AuthPasswordReset): Promise<void> {
  const normalizedEmail = normalizeEmail(email);
  const trimmedCurrentPassword = currentPassword.trim();
  const trimmedNewPassword = newPassword.trim();

  if (!isValidEmail(normalizedEmail)) {
    throw new Error("Enter a valid email address.");
  }

  if (!trimmedCurrentPassword) {
    throw new Error("Current password is required.");
  }

  if (!allPasswordChecksMet(getPasswordChecks(trimmedNewPassword))) {
    throw new Error(
      "New password must be at least 8 chars and include one number and one special character."
    );
  }

  if (trimmedNewPassword !== confirmPassword.trim()) {
    throw new Error("New password and confirm password do not match.");
  }

  const result = await postJson<ApiResponse>("reset-password.php", {
    email: normalizedEmail,
    currentPassword: trimmedCurrentPassword,
    newPassword: trimmedNewPassword,
  });

  if (!result.ok) {
    throw new Error(result.message ?? "Unable to reset password.");
  }
}
