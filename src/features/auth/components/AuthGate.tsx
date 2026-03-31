import { useMemo, useState } from "react";

import { MicIcon, PlayIcon } from "lucide-react";

import { BLOBULAR_AUTH_MODE } from "@/shared/config/appConfig";

import type {
  AuthCredentials,
  AuthPasswordReset,
  AuthRegistration,
} from "../types";
import { useAuth } from "../hooks/useAuth";
import {
  getPasswordChecks,
  type PasswordChecks,
} from "../utils/authValidation";

type AuthMode = "sign-in" | "sign-up" | "reset-password";

type AuthGateProps = {
  version: string;
};

const initialSignInState: AuthCredentials = {
  email: "",
  password: "",
  rememberMe: false,
};

const initialSignUpState: AuthRegistration = {
  email: "",
  password: "",
  confirmPassword: "",
};

const initialResetState: AuthPasswordReset = {
  email: "",
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

const passwordCriteria: Array<{
  id: keyof PasswordChecks;
  label: string;
}> = [
  { id: "minLength", label: "At least 8 characters" },
  { id: "hasNumber", label: "At least one number" },
  { id: "hasSpecial", label: "At least one special character" },
];

export default function AuthGate({ version }: AuthGateProps) {
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signInForm, setSignInForm] = useState<AuthCredentials>(
    initialSignInState
  );
  const [signUpForm, setSignUpForm] = useState<AuthRegistration>(
    initialSignUpState
  );
  const [resetForm, setResetForm] = useState<AuthPasswordReset>(
    initialResetState
  );

  const activePasswordChecks = useMemo(() => {
    if (mode === "sign-up") {
      return getPasswordChecks(signUpForm.password);
    }

    if (mode === "reset-password") {
      return getPasswordChecks(resetForm.newPassword);
    }

    return null;
  }, [mode, resetForm.newPassword, signUpForm.password]);

  function showMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError(null);
    setSuccess(null);
  }

  async function handleSignInSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await signIn(signInForm);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to sign in."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSignUpSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await signUp(signUpForm);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to create account."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResetSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await resetPassword(resetForm);
      setSuccess("Password updated. You can sign in now.");
      setSignInForm((prev) => ({
        ...prev,
        email: resetForm.email.trim().toLowerCase(),
      }));
      setResetForm(initialResetState);
      setMode("sign-in");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to reset password."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-stage">
        <section className="auth-hero">
          <p className="eyebrow">Blobular private preview</p>
          <h1>Sign in before you enter the pond.</h1>
          <p className="auth-copy">
            This branch now treats Blobular as a personal workspace. The app is
            behind an auth boundary first, then the audio library and public
            sharing rules plug into that boundary next.
          </p>
          <div className="auth-steps">
            <p>
              <MicIcon size={18} /> Record or upload source sounds.
            </p>
            <p>
              <PlayIcon size={18} /> Play them through the blobular engine.
            </p>
            <p>Keep drafts private until you choose to publish them.</p>
          </div>
        </section>

        <section className="auth-card">
          <div className="auth-card-header">
            <p className="version-badge">version {version}</p>
            <div className="auth-toggle">
              <button
                className={mode === "sign-in" ? "active" : ""}
                type="button"
                onClick={() => showMode("sign-in")}
              >
                Sign In
              </button>
              <button
                className={mode === "sign-up" ? "active" : ""}
                type="button"
                onClick={() => showMode("sign-up")}
              >
                Create Account
              </button>
            </div>
          </div>

          <p className="auth-note">
            {BLOBULAR_AUTH_MODE === "local-dev"
              ? "Development sign-in mode is enabled on this build."
              : "Sign in or create an account to access your Blobular workspace."}
          </p>

          {error && <div className="auth-error">{error}</div>}
          {success && <div className="auth-success">{success}</div>}

          {mode === "sign-in" && (
            <form className="auth-form" onSubmit={handleSignInSubmit}>
              <label>
                <span>Email</span>
                <input
                  type="email"
                  autoComplete="email"
                  value={signInForm.email}
                  onChange={(e) =>
                    setSignInForm((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                  required
                />
              </label>
              <label>
                <span>Password</span>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={signInForm.password}
                  onChange={(e) =>
                    setSignInForm((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                  required
                />
              </label>
              <label className="auth-remember" htmlFor="auth-remember-me">
                <input
                  id="auth-remember-me"
                  type="checkbox"
                  checked={Boolean(signInForm.rememberMe)}
                  onChange={(e) =>
                    setSignInForm((prev) => ({
                      ...prev,
                      rememberMe: e.target.checked,
                    }))
                  }
                />
                <span>Remember me on this browser</span>
              </label>
              <button
                className="auth-submit"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Signing in..." : "Enter Blobular"}
              </button>
              <button
                className="auth-link-button"
                type="button"
                onClick={() => {
                  setResetForm((prev) => ({
                    ...prev,
                    email: signInForm.email,
                  }));
                  showMode("reset-password");
                }}
              >
                Reset password
              </button>
            </form>
          )}

          {mode === "sign-up" && (
            <form className="auth-form" onSubmit={handleSignUpSubmit}>
              <label>
                <span>Email</span>
                <input
                  type="email"
                  autoComplete="email"
                  value={signUpForm.email}
                  onChange={(e) =>
                    setSignUpForm((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                  required
                />
              </label>
              <label>
                <span>Password</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={signUpForm.password}
                  onChange={(e) =>
                    setSignUpForm((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                  required
                />
              </label>
              <label>
                <span>Confirm password</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={signUpForm.confirmPassword}
                  onChange={(e) =>
                    setSignUpForm((prev) => ({
                      ...prev,
                      confirmPassword: e.target.value,
                    }))
                  }
                  required
                />
              </label>
              <ul className="auth-criteria-list">
                {passwordCriteria.map((criterion) => (
                  <li key={criterion.id}>
                    <span
                      aria-hidden="true"
                      className={`auth-criteria-dot ${
                        activePasswordChecks?.[criterion.id]
                          ? "is-met"
                          : "is-unmet"
                      }`}
                    />
                    <span>{criterion.label}</span>
                  </li>
                ))}
              </ul>
              <button
                className="auth-submit"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Creating account..." : "Create Account"}
              </button>
              <button
                className="auth-link-button"
                type="button"
                onClick={() => showMode("sign-in")}
              >
                Back to sign in
              </button>
            </form>
          )}

          {mode === "reset-password" && (
            <form className="auth-form" onSubmit={handleResetSubmit}>
              <label>
                <span>Email</span>
                <input
                  type="email"
                  autoComplete="email"
                  value={resetForm.email}
                  onChange={(e) =>
                    setResetForm((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                  required
                />
              </label>
              <label>
                <span>Current password</span>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={resetForm.currentPassword}
                  onChange={(e) =>
                    setResetForm((prev) => ({
                      ...prev,
                      currentPassword: e.target.value,
                    }))
                  }
                  required
                />
              </label>
              <label>
                <span>New password</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={resetForm.newPassword}
                  onChange={(e) =>
                    setResetForm((prev) => ({
                      ...prev,
                      newPassword: e.target.value,
                    }))
                  }
                  required
                />
              </label>
              <label>
                <span>Confirm new password</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={resetForm.confirmPassword}
                  onChange={(e) =>
                    setResetForm((prev) => ({
                      ...prev,
                      confirmPassword: e.target.value,
                    }))
                  }
                  required
                />
              </label>
              <ul className="auth-criteria-list">
                {passwordCriteria.map((criterion) => (
                  <li key={criterion.id}>
                    <span
                      aria-hidden="true"
                      className={`auth-criteria-dot ${
                        activePasswordChecks?.[criterion.id]
                          ? "is-met"
                          : "is-unmet"
                      }`}
                    />
                    <span>{criterion.label}</span>
                  </li>
                ))}
              </ul>
              <button
                className="auth-submit"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Updating password..." : "Reset Password"}
              </button>
              <button
                className="auth-link-button"
                type="button"
                onClick={() => showMode("sign-in")}
              >
                Back to sign in
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
