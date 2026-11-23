import { useState, type FormEvent } from "react";
import { useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../shared/api/client";
import {
  ActionError,
  Field,
  FormActions,
  Loading,
  PageHeader,
  Panel,
  StatusBadge,
  SuccessNotice,
} from "../../../shared/components/ui";
import type { User } from "../../../shared/types/domain";
export function UserDetailPage() {
  const { userId } = useParams({ from: "/_app/admin/users/$userId" });
  const user = useQuery({
    queryKey: ["admin", "user", userId],
    queryFn: () => api.get<User>(`/admin/users/${userId}`),
  });
  return user.isPending ? (
    <Loading />
  ) : user.isError ? (
    <ActionError error={user.error} />
  ) : (
    <UserEditor
      key={user.data.version}
      user={user.data}
    />
  );
}
function UserEditor({ user }: { user: User }) {
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
      const result = await api.mutate<{ temporaryPassword?: string }>(
        `/admin/users/${user.id}${path}`,
        payload,
        { method, ...(user.version !== undefined ? { version: user.version } : {}) },
      );
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
  return (
    <>
      <PageHeader
        title={user.name}
        description={`Employee ${user.employeeCode ?? ""} · ${user.email}`}
        action={
          <a
            className="button secondary"
            href="/admin/users"
          >
            Back to users
          </a>
        }
      />
      <div className="detail-columns">
        <Panel title="Account settings">
          <form
            className="form-stack"
            onSubmit={submit}
          >
            <Field label="Full name">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label="Role">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as User["role"])}
              >
                <option value="EMPLOYEE">Employee</option>
                <option value="FACILITY_MANAGER">Facility Manager</option>
                <option value="ADMIN">Admin</option>
              </select>
            </Field>
            <FormActions
              busy={busy}
              text="Save changes"
            />
          </form>
        </Panel>
        <Panel title="Account operations">
          <div className="info-stack">
            <div>
              Status: <StatusBadge status={user.status ?? "ACTIVE"} />
            </div>
            <button
              disabled={busy}
              className="button secondary"
              onClick={() => void run("/credential-reset")}
            >
              Reset credentials
            </button>
            {user.status === "ACTIVE" ? (
              <button
                disabled={busy}
                className="button danger-ghost"
                onClick={() => {
                  if (window.confirm("Deactivate this employee and revoke their sessions?"))
                    void run("/deactivate", { reason: "Disabled by administrator" });
                }}
              >
                Deactivate account
              </button>
            ) : (
              <button
                disabled={busy}
                className="button secondary"
                onClick={() => void run("/activate")}
              >
                Activate account
              </button>
            )}
            {credential && (
              <div className="credential-notice">
                <strong>Copy temporary password once</strong>
                <code>{credential}</code>
              </div>
            )}
          </div>
        </Panel>
      </div>
      <ActionError error={error} />
      {success && <SuccessNotice>{success}</SuccessNotice>}
    </>
  );
}
