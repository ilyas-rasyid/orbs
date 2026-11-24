import { useLogin } from "../hooks/useLogin";
import type { FormEvent } from "react";
import { Navigate } from "@tanstack/react-router";
import { api } from "../../../shared/api/client";
import { ActionError, Field, Loading } from "../../../shared/components/ui";

export function LoginPage() {
  const {
    user,
    loading,
    refresh,
    email,
    setEmail,
    password,
    setPassword,
    busy,
    setBusy,
    error,
    setError,
  } = useLogin();
  if (loading) return <Loading label="Checking session…" />;
  if (user) return <Navigate to="/dashboard" />;
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.login(email, password);
      await refresh();
      window.location.href = "/dashboard";
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="login-screen">
      <aside className="login-aside">
        <div className="login-brand">
          <span className="brand-emblem">O</span> ORBS
        </div>
        <div className="login-intro">
          <span className="eyebrow">WORKPLACE OPERATIONS</span>
          <h1>
            Every resource.
            <br />
            One clear schedule.
          </h1>
          <p>
            Meeting rooms, operational vehicles, and office equipment, managed from one dependable
            workspace.
          </p>

        </div>
        <div className="login-footer">Office Resource Booking System</div>
      </aside>
      <main className="login-form-side">
        <form
          onSubmit={(e) => void submit(e)}
          className="login-form"
        >
          <div className="login-mobile-brand">
            <span className="brand-emblem">O</span> ORBS
          </div>
          <h2>Welcome back</h2>
          <p>Sign in with your employee account to access the workspace.</p>
          <div className="form-stack">
            <Field label="Work email">
              <input
                type="email"
                aria-label="Email kantor"
                autoComplete="username"
                required
                value={email}
                placeholder="employee@northstar.example"
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label="Password">
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                placeholder="Enter password"
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
          </div>
          <ActionError error={error} />
          <button
            className="button primary login-submit"
            disabled={busy}
            type="submit"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
          <small className="login-note">
            Access is restricted to authorized employees. Contact Admin if you need an account.
          </small>
        </form>
      </main>
    </div>
  );
}
