import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, UserRoundCog } from "lucide-react";
import { api } from "../../../shared/api/client";
import {
  ActionError,
  Empty,
  Field,
  FormActions,
  Loading,
  PageHeader,
  Panel,
  StatusBadge,
} from "../../../shared/components/ui";
import type { ApiList, User } from "../../../shared/types/domain";
export function UsersPage() {
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
    queryFn: () => api.get<ApiList<User>>("/admin/users?limit=100"),
  });
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    setPassword("");
    try {
      const result = await api.mutate<{ temporaryPassword: string }>("/admin/users", {
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
  return (
    <>
      <PageHeader
        title="Users"
        description="Manajemen akun internal, role, dan akses pengguna."
        action={
          <button
            className="button primary"
            onClick={() => setCreateOpen(!createOpen)}
          >
            <Plus size={17} /> Add employee
          </button>
        }
      />
      {password && (
        <div
          className="credential-notice"
          role="alert"
        >
          <strong>Temporary credential — copy once</strong>
          <p>Bagikan melalui kanal aman. Akun wajib mengganti password saat login.</p>
          <code>{password}</code>
          <button
            className="button secondary small"
            onClick={() => void navigator.clipboard.writeText(password)}
          >
            Copy
          </button>
          <button
            className="button secondary small"
            onClick={() => setPassword("")}
          >
            Dismiss
          </button>
        </div>
      )}
      {createOpen && (
        <Panel title="New employee">
          <form
            className="form-stack"
            onSubmit={(e) => void submit(e)}
          >
            <div className="form-grid">
              <Field label="Employee code">
                <input
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </Field>
              <Field label="Full name">
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </Field>
              <Field label="Email">
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
              <Field label="Role">
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="EMPLOYEE">Employee</option>
                  <option value="FACILITY_MANAGER">Facility Manager</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </Field>
            </div>
            <ActionError error={error} />
            <FormActions
              busy={busy}
              text="Create account"
            />
          </form>
        </Panel>
      )}
      <Panel title="Employee directory">
        {users.isPending ? (
          <Loading />
        ) : users.isError ? (
          <ActionError error={users.error} />
        ) : users.data.data.length === 0 ? (
          <Empty title="No accounts found" />
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.data.data.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <strong>{user.name}</strong>
                      <small className="cell-secondary">{user.employeeCode}</small>
                    </td>
                    <td>{user.email}</td>
                    <td>{user.role.replaceAll("_", " ")}</td>
                    <td>
                      <StatusBadge status={user.status ?? "ACTIVE"} />
                    </td>
                    <td>
                      <a
                        className="button small secondary"
                        href={`/admin/users/${user.id}`}
                      >
                        <UserRoundCog size={15} /> Manage
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
