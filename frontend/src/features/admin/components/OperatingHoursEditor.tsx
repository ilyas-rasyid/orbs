import type { OperatingWindow } from "../types/operating-window.types";
import { useOperatingHours } from "../hooks/useOperatingHours";
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

const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function OperatingHoursEditor({ facility }: { facility: Facility }) {
  const { query, windows, setWindows, error, success, busy, addWindow, changeWindow, save } =
    useOperatingHours({ facility });
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
