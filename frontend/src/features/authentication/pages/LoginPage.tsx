import { useLogin } from "../hooks/useLogin";
import type { FormEvent } from "react";
import { Navigate } from "@tanstack/react-router";
import { ArrowRight, LockKeyhole, ShieldCheck } from "lucide-react";
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
  if (loading) return <Loading label="Memeriksa sesi…" />;
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
            Ruang meeting, kendaraan dan peralatan kantor, dikelola dari satu workspace yang mudah
            diandalkan.
          </p>
          <div className="login-feature">
            <ShieldCheck size={18} />
            <span>Secure, permission-aware internal workspace</span>
          </div>
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
          <div className="login-icon">
            <LockKeyhole size={23} />
          </div>
          <h2>Welcome back</h2>
          <p>Masuk dengan akun karyawan untuk mengakses workspace.</p>
          <div className="form-stack">
            <Field label="Email kantor">
              <input
                type="email"
                autoComplete="username"
                required
                value={email}
                placeholder="employee@company.com"
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label="Password">
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                placeholder="Masukkan password"
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
            {busy ? (
              "Memverifikasi…"
            ) : (
              <>
                Sign in <ArrowRight size={17} />
              </>
            )}
          </button>
          <small className="login-note">
            Akses hanya untuk pengguna yang terdaftar. Hubungi Admin jika memerlukan akun.
          </small>
        </form>
      </main>
    </div>
  );
}
