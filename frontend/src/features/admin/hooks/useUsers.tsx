import { usersApi } from "../services/users.api";
import { useState } from "react";
import type { FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export function useUsers() {
  const client = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [role, setRole] = useState("EMPLOYEE");
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState("");
  const users = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => usersApi.list(),
  });
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    setPassword("");
    try {
      const result = await usersApi.create({
        name,
        email,
        employeeCode: code,
        role,
      });
      setPassword(result.temporaryPassword);
      setCreateOpen(false);
      await client.invalidateQueries({ queryKey: ["admin", "users"] });
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  };
  return {
    createOpen,
    setCreateOpen,
    name,
    setName,
    email,
    setEmail,
    code,
    setCode,
    role,
    setRole,
    error,
    busy,
    password,
    setPassword,
    users,
    submit,
  };
}
