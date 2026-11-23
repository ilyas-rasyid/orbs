import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Wrench } from "lucide-react";
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
  SuccessNotice,
} from "../../../shared/components/ui";
import type { Maintenance, Facility, ApiList } from "../../../shared/types/domain";
import { displayRange, localDatetime, toIso } from "../../../shared/utils/dates";
export function MaintenancePage() {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["maintenance"],
    queryFn: () => api.get<Maintenance[]>("/operations/maintenance"),
  });
  const facilities = useQuery({
    queryKey: ["facilities", "maintenance-options"],
    queryFn: () => api.get<ApiList<Facility>>("/facilities?limit=100"),
  });
  const [open, setOpen] = useState(false);
  const [facilityId, setFacilityId] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [start, setStart] = useState(() => {
    const date = new Date(Date.now() + 86400_000);
    date.setMinutes(Math.ceil(date.getMinutes() / 15) * 15, 0, 0);
    return localDatetime(date);
  });
  const [end, setEnd] = useState(() => {
    const date = new Date(Date.now() + 90000_000);
    date.setMinutes(Math.ceil(date.getMinutes() / 15) * 15, 0, 0);
    return localDatetime(date);
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [message, setMessage] = useState("");
  const create = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.mutate("/operations/maintenance", {
        facilityId,
        reason,
        notes,
        startAt: toIso(start),
        endAt: toIso(end),
      });
      await client.invalidateQueries({ queryKey: ["maintenance"] });
      setOpen(false);
      setMessage("Maintenance scheduled.");
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  };
  const transition = async (item: Maintenance, verb: "start" | "complete" | "cancel") => {
    if (verb === "cancel" && !window.confirm(`Cancel maintenance ${item.reference}?`)) return;
    setBusy(true);
    setError(null);
    setMessage("");
    try {
      await api.mutate(
        `/operations/maintenance/${item.id}/${verb}`,
        verb === "cancel" ? { reason: "Cancelled by facility manager" } : {},
        { version: item.version },
      );
      await client.invalidateQueries({ queryKey: ["maintenance"] });
      setMessage(`Maintenance ${verb} processed.`);
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageHeader
        title="Maintenance"
        description="Rencanakan perawatan tanpa berbenturan dengan booking yang telah terkonfirmasi."
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
                <input
                  type="datetime-local"
                  required
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                />
              </Field>
              <Field label="End">
                <input
                  type="datetime-local"
                  required
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
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
