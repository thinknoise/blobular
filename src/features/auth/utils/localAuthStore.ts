import type { AuthCredentials, AuthRegistration, AuthUser } from "../types";

type StoredLocalAuthUser = AuthUser & {
  password: string;
};

type StoredLocalAuthSession = {
  userId: string;
};

const USERS_KEY = "blobular.localAuth.users";
const SESSION_KEY = "blobular.localAuth.session";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function loadUsers(): StoredLocalAuthUser[] {
  try {
    const raw = window.localStorage.getItem(USERS_KEY);
    return raw ? (JSON.parse(raw) as StoredLocalAuthUser[]) : [];
  } catch {
    return [];
  }
}

function saveUsers(users: StoredLocalAuthUser[]): void {
  window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function loadSession(): StoredLocalAuthSession | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as StoredLocalAuthSession) : null;
  } catch {
    return null;
  }
}

function saveSession(session: StoredLocalAuthSession): void {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  window.localStorage.removeItem(SESSION_KEY);
}

function toAuthUser(user: StoredLocalAuthUser): AuthUser {
  const { password: _password, ...authUser } = user;
  return authUser;
}

function makeUser(email: string, password: string): StoredLocalAuthUser {
  return {
    id: crypto.randomUUID(),
    email: normalizeEmail(email),
    password,
    createdAt: new Date().toISOString(),
    authProvider: "local-dev",
  };
}

export function getCurrentUser(): AuthUser | null {
  const session = loadSession();
  if (!session) {
    return null;
  }

  const user = loadUsers().find((entry) => entry.id === session.userId);
  return user ? toAuthUser(user) : null;
}

export function signInWithLocalAuth({
  email,
  password,
}: AuthCredentials): AuthUser {
  const normalizedEmail = normalizeEmail(email);
  const user = loadUsers().find(
    (entry) =>
      entry.email === normalizedEmail && entry.password === password.trim()
  );

  if (!user) {
    throw new Error("Incorrect email or password.");
  }

  saveSession({ userId: user.id });
  return toAuthUser(user);
}

export function signUpWithLocalAuth({
  email,
  password,
  confirmPassword,
}: AuthRegistration): AuthUser {
  const normalizedEmail = normalizeEmail(email);
  const trimmedPassword = password.trim();

  if (!normalizedEmail) {
    throw new Error("Email is required.");
  }

  if (trimmedPassword.length < 6) {
    throw new Error("Password must be at least 6 characters.");
  }

  if (trimmedPassword !== confirmPassword.trim()) {
    throw new Error("Passwords do not match.");
  }

  const users = loadUsers();
  if (users.some((entry) => entry.email === normalizedEmail)) {
    throw new Error("An account with that email already exists.");
  }

  const user = makeUser(normalizedEmail, trimmedPassword);
  saveUsers([...users, user]);
  saveSession({ userId: user.id });

  return toAuthUser(user);
}
