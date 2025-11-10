import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
          <h2>Sign in to Puma Printables</h2>
          <p className="small-muted">
            Use your backend credentials to access orders and approvals.
          </p>

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
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="current-password"
              disabled={isFormDisabled}
            />
          </label>

          <button
            className="primary-button"
            type="submit"
            disabled={isFormDisabled}
          >
            {isLoading ? "Signing in…" : "Sign in"}
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
                  theme="outline"
                  shape="rectangular"
                  text="signin_with"
                />
                {isGoogleLoading ? (
                  <p className="small-muted" style={{ marginTop: "0.5rem" }}>
                    Finishing Google sign-in…
                  </p>
                ) : null}
              </div>
            </>
          ) : null}
        </form>
      </div>
    </>
  );
}
