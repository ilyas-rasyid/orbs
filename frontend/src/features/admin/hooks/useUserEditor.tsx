import { usersApi } from "../services/users.api";
import { useState } from "react";
import type { FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { User } from "../../../shared/types/domain";

export function useUserEditor({ user }: { user: User }) {
  const client = useQueryClient();
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState(user.role);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [success, setSuccess] = useState("");
  const [credential, setCredential] = useState("");
  const refresh = () => client.invalidateQueries({ queryKey: ["admin"] });
  const run = async (path: string, payload: object = {}, method: "POST" | "PATCH" = "POST") => {
    setBusy(true);
    setError(null);
    setSuccess("");
    setCredential("");
    try {
      const result = await usersApi.update(user.id, path, payload, method, user.version);
      if (result.temporaryPassword) {
        setCredential(result.temporaryPassword);
        setSuccess("Reset complete. Copy this temporary credential before leaving.");
      } else {
        setSuccess("Changes saved successfully.");
        await refresh();
      }
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void run("", { name, email, role }, "PATCH");
  };
  return {
    name,
    setName,
    email,
    setEmail,
    role,
    setRole,
    busy,
    error,
    success,
    credential,
    run,
    submit,
  };
}
