import { useBookingActions } from "../hooks/useBookingActions";
import { CalendarClock } from "lucide-react";
import { ActionError, Field, SuccessNotice } from "../../../shared/components/ui";
import type { Booking } from "../../../shared/types/domain";

const closed = new Set(["COMPLETED", "NO_SHOW", "CANCELLED", "REJECTED", "EXPIRED"]);

export function BookingActions({ booking }: { booking: Booking }) {
  const {
    reason,
    setReason,
    exceptionReason,
    setExceptionReason,
    condition,
    setCondition,
    odometer,
    setOdometer,
    driver,
    setDriver,
    driverSearch,
    setDriverSearch,
    busy,
    error,
    message,
    manager,
    own,
    room,
    vehicle,
    canCancel,
    hasStarted,
    drivers,
    operations,
    selfAction,
  } = useBookingActions({ booking });
  if (closed.has(booking.status)) {
    return <p className="hint">This booking is closed. Its history is preserved.</p>;
  }

  return (
    <div className="action-stack">
      {booking.status === "PENDING" && manager && (
        <>
          <Field label="Decision reason (required for rejection)">
            <textarea
              rows={2}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </Field>
          <Field label="Admin exception reason (self-approval only)">
            <input
              value={exceptionReason}
              onChange={(event) => setExceptionReason(event.target.value)}
            />
          </Field>
          <div className="form-actions">
            <button
              type="button"
              className="button secondary"
              disabled={busy || reason.trim().length < 3}
              onClick={() => void operations("reject", { reason }, true)}
            >
              Reject
            </button>
            <button
              type="button"
              className="button primary"
              disabled={busy}
              onClick={() =>
                void operations("approve", {
                  exceptionReason: exceptionReason.trim() || undefined,
                })
              }
            >
              Approve
            </button>
          </div>
        </>
      )}

      {booking.status === "CONFIRMED" && room && (own || manager) && (
        <button
          type="button"
          className="button primary"
          disabled={busy}
          onClick={() => void selfAction("check-in", { condition: "GOOD" })}
        >
          <CalendarClock size={17} /> Check in
        </button>
      )}

      {booking.status === "CONFIRMED" && !room && manager && (
        <>
          <ConditionField
            value={condition}
            onChange={setCondition}
            label="Condition at handover"
          />
          {vehicle && (
            <>
              <Field label="Actual driver">
                <p className="hint">Change the selected driver by searching employees.</p>
                <input
                  value={driverSearch}
                  placeholder="Search employee (min. 2 characters)"
                  onChange={(event) => setDriverSearch(event.target.value)}
                />
                <select
                  value={driver}
                  onChange={(event) => setDriver(event.target.value)}
                >
                  <option value={booking.trip?.designatedDriverId ?? ""}>
                    Designated driver (original)
                  </option>
                  {drivers.data?.map((person) => (
                    <option
                      key={person.id}
                      value={person.id}
                    >
                      {person.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Starting odometer (km)">
                <input
                  type="number"
                  min="0"
                  value={odometer}
                  onChange={(event) => setOdometer(Number(event.target.value))}
                />
              </Field>
            </>
          )}
          <button
            type="button"
            className="button primary"
            disabled={busy || (vehicle && !driver)}
            onClick={() =>
              void operations("handover", {
                condition,
                ...(vehicle ? { actualDriverId: driver, startingOdometer: odometer } : {}),
              })
            }
          >
            Confirm handover
          </button>
        </>
      )}

      {booking.status === "IN_USE" && room && (own || manager) && (
        <button
          type="button"
          className="button primary"
          disabled={busy}
          onClick={() => void selfAction("check-out", { condition: "GOOD" })}
        >
          Complete check-out
        </button>
      )}

      {booking.status === "IN_USE" && !room && manager && (
        <>
          <ConditionField
            value={condition}
            onChange={setCondition}
            label="Condition at return"
          />
          {vehicle && (
            <Field label="Ending odometer (km)">
              <input
                type="number"
                min={booking.usage?.vehicle?.startOdometer ?? 0}
                value={odometer}
                onChange={(event) => setOdometer(Number(event.target.value))}
              />
            </Field>
          )}
          <Field label="Damage / return notes">
            <textarea
              rows={2}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </Field>
          <button
            type="button"
            className="button primary"
            disabled={busy || (condition === "DAMAGED" && reason.trim().length === 0)}
            onClick={() =>
              void operations("return", {
                condition,
                damageNotes: reason,
                ...(vehicle ? { endingOdometer: odometer } : {}),
              })
            }
          >
            Complete return
          </button>
        </>
      )}

      {booking.status === "CONFIRMED" && manager && (
        <>
          <Field label="No-show reason">
            <input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </Field>
          <button
            type="button"
            className="button secondary"
            disabled={busy || reason.trim().length < 3}
            onClick={() => void operations("no-show", { reason }, true)}
          >
            Mark as no-show
          </button>
        </>
      )}

      {canCancel && (!hasStarted || manager) && (
        <>
          <div className="divider-line" />
          <Field label="Cancellation reason">
            <input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Explain the cancellation"
            />
          </Field>
          {!hasStarted && (
            <button
              type="button"
              className="button danger-ghost"
              disabled={busy}
              onClick={() =>
                void selfAction(
                  "cancel",
                  {
                    reason,
                    reasonCategory: "NORMAL",
                  },
                  true,
                )
              }
            >
              Cancel booking
            </button>
          )}
          {manager && booking.status === "CONFIRMED" && (
            <button
              type="button"
              className="button danger-ghost"
              disabled={busy || reason.trim().length < 3}
              onClick={() =>
                void selfAction(
                  "cancel",
                  {
                    reason,
                    reasonCategory: "RESOURCE_UNAVAILABLE",
                  },
                  true,
                )
              }
            >
              Cancel due to verified facility disruption
            </button>
          )}
        </>
      )}
      {message && <SuccessNotice>{message}</SuccessNotice>}
      <ActionError error={error} />
    </div>
  );
}

function ConditionField({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  return (
    <Field label={label}>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="GOOD">Good</option>
        <option value="FAIR">Fair</option>
        <option value="DAMAGED">Damaged</option>
      </select>
    </Field>
  );
}
