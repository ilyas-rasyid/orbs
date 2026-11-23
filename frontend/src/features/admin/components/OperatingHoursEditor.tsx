import { useEffect, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../shared/api/client";
import {
  ActionError,
  Empty,
  Field,
  FormActions,
  Loading,
  Panel,
  SuccessNotice,
  TimeInput,
} from "../../../shared/components/ui";
import type { Facility } from "../../../shared/types/domain";

type OperatingWindow = {
  id?: string;
  dayOfWeek: number;
  opens: string;
  closes: string;
  kind: "BOOKING" | "HANDOVER" | "RETURN";
};
const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function OperatingHoursEditor({ facility }: { facility: Facility }) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["operating-windows", facility.id],
    queryFn: () => api.get<OperatingWindow[]>(`/facilities/${facility.id}/operating-windows`),
  });
  const [windows, setWindows] = useState<OperatingWindow[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (query.data) setWindows(query.data);
  }, [query.data]);

  function addWindow() {
    setWindows((items) => [
      ...items,
      {
        dayOfWeek: 1,
        opens: "08:00",
        closes: "18:00",
        kind: facility.category.code === "MEETING_ROOM" ? "BOOKING" : "HANDOVER",
      },
    ]);
  }

  function changeWindow(index: number, patch: Partial<OperatingWindow>) {
    setWindows((items) => items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setSuccess("");
    try {
      await api.mutate(
        `/admin/facilities/${facility.id}/operating-windows`,
        {
          windows: windows.map(({ dayOfWeek, opens, closes, kind }) => ({
            dayOfWeek,
            opens,
            closes,
            kind,
          })),
        },
        { method: "PUT", version: facility.version },
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["operating-windows", facility.id] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "facility", facility.id] }),
        queryClient.invalidateQueries({ queryKey: ["facilities"] }),
      ]);
      setSuccess("Operating hours updated.");
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel title="Operating hours">
      {query.isPending ? (
        <Loading />
      ) : query.isError ? (
        <ActionError error={query.error} />
      ) : (
        <form
          className="form-stack"
          onSubmit={(event) => void save(event)}
        >
          <p className="hint">
            Booking windows must cover the full meeting. Handovers and returns use service windows;
            late returns may still be recorded for safety.
          </p>
          {!windows.length && <Empty title="No operating windows" />}
          {windows.map((window, index) => (
            <div
              className="window-row"
              key={`${index}-${window.id ?? "new"}`}
            >
              <Field label="Day">
                <select
                  value={window.dayOfWeek}
                  onChange={(event) =>
                    changeWindow(index, {
                      dayOfWeek: Number(event.target.value),
                    })
                  }
                >
                  {weekdays.map((day, dayIndex) => (
                    <option
                      value={dayIndex}
                      key={day}
                    >
                      {day}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Type">
                <select
                  value={window.kind}
                  onChange={(event) =>
                    changeWindow(index, {
                      kind: event.target.value as OperatingWindow["kind"],
                    })
                  }
                >
                  <option value="BOOKING">Booking</option>
                  <option value="HANDOVER">Handover</option>
                  <option value="RETURN">Return</option>
                </select>
              </Field>
              <Field label="From">
                <TimeInput
                  value={window.opens}
                  onChange={(value) =>
                    changeWindow(index, {
                      opens: value,
                    })
                  }
                />
              </Field>
              <Field label="To">
                <TimeInput
                  value={window.closes}
                  onChange={(value) =>
                    changeWindow(index, {
                      closes: value,
                    })
                  }
                />
              </Field>
              <button
                type="button"
                className="button small danger-ghost"
                onClick={() => setWindows((items) => items.filter((_, i) => i !== index))}
              >
                Remove
              </button>
            </div>
          ))}
          <div className="form-actions">
            <button
              className="button secondary"
              type="button"
              onClick={addWindow}
            >
              Add window
            </button>
            <FormActions
              busy={busy}
              text="Save hours"
            />
          </div>
          <ActionError error={error} />
          {success && <SuccessNotice>{success}</SuccessNotice>}
        </form>
      )}
    </Panel>
  );
}
