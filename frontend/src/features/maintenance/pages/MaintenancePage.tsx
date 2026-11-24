import { useMaintenance } from "../hooks/useMaintenance";
import { Plus, Wrench } from "lucide-react";
import {
  ActionError,
  DateTimeInput,
  Empty,
  Field,
  FormActions,
  Loading,
  PageHeader,
  Panel,
  StatusBadge,
  SuccessNotice,
} from "../../../shared/components/ui";
import { displayRange } from "../../../shared/utils/dates";

export function MaintenancePage() {
  const {
    query,
    facilities,
    open,
    setOpen,
    facilityId,
    setFacilityId,
    reason,
    setReason,
    notes,
    setNotes,
    start,
    setStart,
    end,
    setEnd,
    busy,
    error,
    message,
    create,
    transition,
  } = useMaintenance();
  return (
    <>
      <PageHeader
        title="Maintenance"
        description="Schedule facility maintenance without conflicting with confirmed reservations."
        action={
          <button
            className="button primary"
            onClick={() => setOpen(!open)}
          >
            <Plus size={17} /> Schedule maintenance
          </button>
        }
      />
      {open && (
        <Panel title="New maintenance">
          <form
            onSubmit={(e) => void create(e)}
            className="form-stack"
          >
            <div className="form-grid">
              <Field label="Facility">
                <select
                  required
                  value={facilityId}
                  onChange={(e) => setFacilityId(e.target.value)}
                >
                  <option value="">Choose resource</option>
                  {facilities.data?.data.map((f) => (
                    <option
                      key={f.id}
                      value={f.id}
                    >
                      {f.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Reason">
                <input
                  required
                  minLength={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </Field>
              <Field label="Start">
                <DateTimeInput
                  required
                  value={start}
                  onChange={setStart}
                />
              </Field>
              <Field label="End">
                <DateTimeInput
                  required
                  value={end}
                  onChange={setEnd}
                />
              </Field>
              <Field label="Notes">
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </Field>
            </div>
            <ActionError error={error} />
            <FormActions
              busy={busy}
              text="Schedule maintenance"
            />
          </form>
        </Panel>
      )}
      {message && <SuccessNotice>{message}</SuccessNotice>}
      {!open && <ActionError error={error} />}
      <Panel title="Maintenance records">
        {query.isPending ? (
          <Loading />
        ) : query.isError ? (
          <ActionError error={query.error} />
        ) : query.data.length === 0 ? (
          <Empty title="No maintenance records yet" />
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Facility</th>
                  <th>Window</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {query.data.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.facility.name}</strong>
                      <small className="cell-secondary">{item.reference}</small>
                    </td>
                    <td>{displayRange(item.startAt, item.endAt)}</td>
                    <td>{item.reason}</td>
                    <td>
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="actions-cell">
                      {item.status === "SCHEDULED" && (
                        <>
                          <button
                            disabled={busy}
                            className="button small secondary"
                            onClick={() => void transition(item, "start")}
                          >
                            <Wrench size={14} /> Start
                          </button>
                          <button
                            disabled={busy}
                            className="button small danger-ghost"
                            onClick={() => void transition(item, "cancel")}
                          >
                            Cancel
                          </button>
                        </>
                      )}
                      {item.status === "IN_PROGRESS" && (
                        <button
                          disabled={busy}
                          className="button small primary"
                          onClick={() => void transition(item, "complete")}
                        >
                          Complete
                        </button>
                      )}
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
