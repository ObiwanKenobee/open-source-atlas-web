import { useState, type FormEvent } from "react";
import type { Actor } from "@shared/types";
import { api, errorMessage } from "../lib/api";
import { Button, FormError } from "./Common";

export function Login({ onSuccess }: { onSuccess: (actor: Actor) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const result = await api.login(email, password);
      onSuccess(result.actor);
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-brand">
          <span className="brand-mark" aria-hidden="true">AS</span>
          <div>
            <div className="wordmark">Atlas Sanctum</div>
            <div className="tagline">Regenerative Decision Engine</div>
          </div>
        </div>
        <h1>Sign in to the decision record</h1>
        <p className="login-intro">
          Every action is attributed to a named person with a role. Sign in with a seeded development account to
          inspect the synthetic demonstration data.
        </p>
        <form className="login-form" onSubmit={submit}>
          <label className="field">
            <span className="field-label">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
              autoFocus
              required
            />
          </label>
          <label className="field">
            <span className="field-label">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          <FormError message={message} />
          <Button type="submit" variant="primary" disabled={busy} className="login-submit">
            {busy ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        <p className="login-foot">
          Development authentication only. Accounts and the shared demo password are listed in README.md. This is not
          an institutional identity provider, and every record shown is synthetic.
        </p>
      </div>
    </div>
  );
}
