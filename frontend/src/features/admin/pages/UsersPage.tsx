import { useUsers } from "../hooks/useUsers";
import { Plus, UserRoundCog } from "lucide-react";
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

export function UsersPage() {
  const {
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
  } = useUsers();
  return (
    <>
      <PageHeader
        title="Users"
        description="Manage internal accounts, roles, and employee access permissions."
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
