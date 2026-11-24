import { useState } from "react";
import type { FormEvent } from "react";
import { api } from "../../../shared/api/client";
import { useAuth } from "../../../shared/auth/AuthProvider";

export function useProfile() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [success, setSuccess] = useState("");
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setSuccess("");
    try {
      await api.mutate("/auth/change-password", { currentPassword, newPassword });
      setSuccess("Password changed. Please sign in again.");
      window.location.href = "/";
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  };
  return {
    user,
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    busy,
    error,
    success,
    submit,
  };
}
