import type { FormEvent } from "react";
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const { token } = await api.login({ username, password });
      onLogin(token);
      navigate(redirectPath, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="centered" style={{ minHeight: "100vh" }}>
      <form
        className="order-card"
        style={{ width: "min(420px, 90%)" }}
        onSubmit={handleSubmit}
      >
        <h2 style={{ margin: "0 0 1rem 0" }}>Sign in to Puma Printables</h2>
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
            style={{
              padding: "0.65rem 0.75rem",
              borderRadius: "0.75rem",
              border: "1px solid rgba(148, 163, 184, 0.5)",
            }}
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
            style={{
              padding: "0.65rem 0.75rem",
              borderRadius: "0.75rem",
              border: "1px solid rgba(148, 163, 184, 0.5)",
            }}
          />
        </label>

        <button
          className="primary-button"
          type="submit"
          disabled={isLoading}
          style={{ width: "100%" }}
        >
          {isLoading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
