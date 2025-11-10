import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { api } from "../services/api";

import "../App.css";

type RegisterPageProps = {
  onLogin: (token: string) => void;
};

type LocationState = {
  from?: {
    pathname: string;
  };
};

export function RegisterPage({ onLogin }: RegisterPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectPath =
    (location.state as LocationState)?.from?.pathname ?? "/orders";

  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const verifyTimeout = useRef<number | null>(null);

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

    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();

    if (!trimmedUsername) {
      setError("Username is required");
      return;
    }

    if (!trimmedEmail) {
      setError("Email is required");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await api.register({
        username: trimmedUsername,
        password,
        email: trimmedEmail,
        fullName: fullName.trim() ? fullName.trim() : null,
      });

      const { token } = await api.login({
        username: trimmedUsername,
        password,
      });
      beginVerification(token);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to complete registration"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormDisabled = isSubmitting || isVerifying;

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
            <h3>Registration complete</h3>
            <p className="small-muted">Setting up your workspace…</p>
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
          aria-busy={isSubmitting}
        >
          <h2>Create your account</h2>
          <p className="small-muted">
            Register as a store partner to start submitting orders for approval.
          </p>

          {error ? <div className="error-banner">{error}</div> : null}

          <label className="meta-block" htmlFor="register-username">
            <span className="meta-label">Username</span>
            <input
              id="register-username"
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
              autoFocus
              autoComplete="username"
              disabled={isFormDisabled}
              maxLength={50}
            />
          </label>

          <label className="meta-block" htmlFor="register-full-name">
            <span className="meta-label">Full name (optional)</span>
            <input
              id="register-full-name"
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              disabled={isFormDisabled}
              maxLength={150}
            />
          </label>

          <label className="meta-block" htmlFor="register-email">
            <span className="meta-label">Email</span>
            <input
              id="register-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
              disabled={isFormDisabled}
              maxLength={100}
            />
          </label>

          <label className="meta-block" htmlFor="register-password">
            <span className="meta-label">Password</span>
            <input
              id="register-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="new-password"
              disabled={isFormDisabled}
              minLength={8}
            />
          </label>

          <label className="meta-block" htmlFor="register-confirm-password">
            <span className="meta-label">Confirm password</span>
            <input
              id="register-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              autoComplete="new-password"
              disabled={isFormDisabled}
              minLength={8}
            />
          </label>

          <button
            className="primary-button"
            type="submit"
            disabled={isFormDisabled}
          >
            {isSubmitting ? "Creating account…" : "Create account"}
          </button>

          <p className="auth-footnote">
            Already have access? <Link to="/login">Sign in instead</Link>.
          </p>
        </form>
      </div>
    </>
  );
}
