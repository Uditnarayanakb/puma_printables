import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { api } from "../services/api";

import "../App.css";

type LoginPageProps = {
  onLogin: (token: string) => void;
};

type LocationState = {
  from?: {
    pathname: string;
  };
};

export function LoginPage({ onLogin }: LoginPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectPath =
    (location.state as LocationState)?.from?.pathname ?? "/orders";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const verifyTimeout = useRef<number | null>(null);
  const googleEnabled = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

  useEffect(() => {
    return () => {
      if (verifyTimeout.current !== null) {
        window.clearTimeout(verifyTimeout.current);
      }
    };
  }, []);

  const beginVerification = (token: string) => {
    onLogin(token);
    setIsVerifying(true);
    verifyTimeout.current = window.setTimeout(() => {
      navigate(redirectPath, { replace: true });
    }, 1200);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isVerifying) {
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      const { token } = await api.login({ username, password });
      beginVerification(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (
    credentials: CredentialResponse
  ): Promise<void> => {
    if (isVerifying || isGoogleLoading) {
      return;
    }
    if (!credentials.credential) {
      setError("Google sign-in did not provide a credential");
      return;
    }
    setError(null);
    setIsGoogleLoading(true);
    try {
      const { token } = await api.loginWithGoogle({
        credential: credentials.credential,
      });
      beginVerification(token);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to sign in with Google right now"
      );
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError("Google sign-in was cancelled. Please try again.");
  };

  const isFormDisabled = isLoading || isVerifying || isGoogleLoading;

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  return (
    <>
      {isVerifying ? (
        <div
          className="verification-overlay"
          role="status"
          aria-live="assertive"
        >
          <div className="verification-card">
            <div className="verification-icon">
              <svg
                className="verification-mark"
                viewBox="0 0 120 120"
                aria-hidden="true"
              >
                <circle className="verification-ring" cx="60" cy="60" r="48" />
                <path className="verification-check" d="M42 64l12 12 26-26" />
              </svg>
            </div>
            <h3>You're verified</h3>
            <p className="small-muted">Redirecting to Orders...</p>
          </div>
        </div>
      ) : null}

      <div
        className={`centered${isVerifying ? " is-dimmed" : ""}`}
        style={{ minHeight: "100vh" }}
      >
        <form
          className="auth-card"
          onSubmit={handleSubmit}
          aria-busy={isLoading}
        >
          <h2>Sign in</h2>

          {error ? <div className="error-banner">{error}</div> : null}

          <label className="meta-block" htmlFor="username">
            <span className="meta-label">Username</span>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
              autoFocus
              autoComplete="username"
              disabled={isFormDisabled}
            />
          </label>

          <label className="meta-block" htmlFor="password">
            <span className="meta-label">Password</span>
            <div className="password-input">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                autoComplete="current-password"
                disabled={isFormDisabled}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={togglePasswordVisibility}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                disabled={isFormDisabled}
              >
                {showPassword ? (
                  <svg
                    key="password-visible"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className="password-toggle-icon password-toggle-icon--revealed"
                  >
                    <path
                      d="M3.98 8.223A10.477 10.477 0 0112 4.5c2.93 0 5.717 1.472 8.02 4.223a16.686 16.686 0 011.98 3.277 16.716 16.716 0 01-1.906 3.154"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M6.228 6.228A16.687 16.687 0 003.02 11.5a16.716 16.716 0 001.98 3.277c2.303 2.751 5.09 4.223 8.02 4.223 1.591 0 3.131-.368 4.556-1.05"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M9.878 9.878a3 3 0 104.243 4.243"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M3 3l18 18"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <svg
                    key="password-hidden"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className="password-toggle-icon password-toggle-icon--concealed"
                  >
                    <path
                      d="M2.036 12.322a1.32 1.32 0 010-.644C3.423 7.51 7.364 4.5 12 4.5c4.636 0 8.577 3.01 9.964 7.178.07.2.07.444 0 .644C20.577 16.49 16.636 19.5 12 19.5c-4.636 0-8.577-3.01-9.964-7.178z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle
                      cx="12"
                      cy="12"
                      r="3"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                  </svg>
                )}
              </button>
            </div>
          </label>

          <button
            className="primary-button"
            type="submit"
            disabled={isFormDisabled}
          >
            {isLoading ? "Signing in..." : "Sign in"}
          </button>

          {googleEnabled ? (
            <>
              <div className="meta-divider" aria-hidden="true">
                <span>or</span>
              </div>
              <div className="google-login" aria-live="polite">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  useOneTap
                  theme="filled_black"
                  shape="rectangular"
                  text="signin_with"
                  size="large"
                />
                {isGoogleLoading ? (
                  <p className="small-muted" style={{ marginTop: "0.5rem" }}>
                    Finishing Google sign-in...
                  </p>
                ) : null}
              </div>
            </>
          ) : null}

          <p className="auth-footnote">
            Need an account? <Link to="/register">Register now</Link>.
          </p>
        </form>
      </div>
    </>
  );
}
