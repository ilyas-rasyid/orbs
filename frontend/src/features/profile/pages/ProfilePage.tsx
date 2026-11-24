import { useProfile } from "../hooks/useProfile";
import {
  ActionError,
  Field,
  FormActions,
  PageHeader,
  Panel,
  StatusBadge,
  SuccessNotice,
} from "../../../shared/components/ui";

export function ProfilePage() {
  const {
    user,
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    busy,
    error,
    success,
    submit,
  } = useProfile();
  return (
    <>
      <PageHeader
        title="My profile"
        description="Account information and personal security settings."
      />
      <div className="detail-columns">
        <Panel title="Identity">
          <dl className="detail-list">
            <div>
              <dt>Name</dt>
              <dd>{user?.name}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{user?.email}</dd>
            </div>
            <div>
              <dt>Role</dt>
              <dd>
                <StatusBadge status={user?.role ?? "EMPLOYEE"} />
              </dd>
            </div>
          </dl>
        </Panel>
        <Panel title="Change password">
          <form
            className="form-stack"
            onSubmit={(e) => void submit(e)}
          >
            <Field label="Current password">
              <input
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </Field>
            <Field label="New password (12+ characters)">
              <input
                type="password"
                minLength={12}
                required
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </Field>
            <ActionError error={error} />
            {success && <SuccessNotice>{success}</SuccessNotice>}
            <FormActions
              busy={busy}
              text="Update password"
            />
          </form>
        </Panel>
      </div>
    </>
  );
}
