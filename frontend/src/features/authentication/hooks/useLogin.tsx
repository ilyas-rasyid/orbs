import { useState } from "react";
import { useAuth } from "../../../shared/auth/AuthProvider";

export function useLogin() {
  const { user, loading, refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  return {
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
  };
}
