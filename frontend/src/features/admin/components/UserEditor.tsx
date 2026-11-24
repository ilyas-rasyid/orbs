import { useUserEditor } from "../hooks/useUserEditor";
import {
  ActionError,
  Field,
  FormActions,
  PageHeader,
  Panel,
  StatusBadge,
  SuccessNotice,
} from "../../../shared/components/ui";
import type { User } from "../../../shared/types/domain";

export function UserEditor({ user }: { user: User }) {
  const {
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
  } = useUserEditor({ user });
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
