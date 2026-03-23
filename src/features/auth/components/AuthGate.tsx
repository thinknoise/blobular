import { useState } from "react";

import { MicIcon, PlayIcon } from "lucide-react";

import type { AuthCredentials, AuthRegistration } from "../types";
import { useAuth } from "../hooks/useAuth";

type AuthMode = "sign-in" | "sign-up";

type AuthGateProps = {
  version: string;
};

const initialSignInState: AuthCredentials = {
  email: "",
  password: "",
};

const initialSignUpState: AuthRegistration = {
  email: "",
  password: "",
  confirmPassword: "",
};

export default function AuthGate({ version }: AuthGateProps) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signInForm, setSignInForm] = useState<AuthCredentials>(
    initialSignInState
  );
  const [signUpForm, setSignUpForm] = useState<AuthRegistration>(
    initialSignUpState
  );

  async function handleSignInSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

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
                onClick={() => {
                  setMode("sign-in");
                  setError(null);
                }}
              >
                Sign In
              </button>
              <button
                className={mode === "sign-up" ? "active" : ""}
                type="button"
                onClick={() => {
                  setMode("sign-up");
                  setError(null);
                }}
              >
                Create Account
              </button>
            </div>
          </div>

          <p className="auth-note">
            This is a local auth shell for now. Cognito-backed auth replaces it
            in the next backend step.
          </p>

          {error && <div className="auth-error">{error}</div>}

          {mode === "sign-in" ? (
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
              <button
                className="auth-submit"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Signing in..." : "Enter Blobular"}
              </button>
            </form>
          ) : (
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
              <button
                className="auth-submit"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Creating account..." : "Create Account"}
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
