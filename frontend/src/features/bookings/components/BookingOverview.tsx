import type { ReactNode } from "react";
import { Empty, Panel, StatusBadge } from "../../../shared/components/ui";
import type { Booking } from "../../../shared/types/domain";
import { displayDate, displayRange, displayTime } from "../../../shared/utils/dates";

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export function BookingOverview({ booking }: { booking: Booking }) {
  return (
    <Panel title="Booking summary">
      <div className="summary-status">
        <StatusBadge status={booking.status} />
      </div>
      <dl className="detail-list">
        <Detail label="Facility">{booking.facility.name}</Detail>
        <Detail label="Category">{booking.facility.category.name}</Detail>
        <Detail label="Location">{booking.facility.location.name}</Detail>
        <Detail label="Scheduled use">{displayRange(booking.startAt, booking.endAt)}</Detail>
        <Detail label="Responsible user">{booking.responsibleUser.name}</Detail>
        <Detail label="Requested by">{booking.requester.name}</Detail>
        <Detail label="Purpose">{booking.purpose}</Detail>
        {booking.meeting && (
          <>
            <Detail label="Meeting">{booking.meeting.title}</Detail>
            <Detail label="Attendees">{booking.meeting.attendees}</Detail>
          </>
        )}
        {booking.trip && (
          <>
            <Detail label="Destination">{booking.trip.destination}</Detail>
            <Detail label="Trip purpose">{booking.trip.travelPurpose}</Detail>
          </>
        )}
        {booking.approval && <Detail label="Approval">{booking.approval.decision}</Detail>}
      </dl>
    </Panel>
  );
}

export function BookingUsageHistory({ booking }: { booking: Booking }) {
  if (!booking.usage) {
    return (
      <Panel title="Usage history">
        <Empty
          title="Not yet used"
          description="Actual usage will appear after check-in or handover."
        />
      </Panel>
    );
  }

  const { usage } = booking;
  return (
    <Panel title="Usage history">
      <dl className="detail-list">
        <Detail label="Actual start">
          {displayDate(usage.startAt)} · {displayTime(usage.startAt)}
        </Detail>
        <Detail label="Actual end">
          {usage.endAt ? displayRange(usage.startAt, usage.endAt) : "Currently in use"}
        </Detail>
        {usage.vehicle && (
          <>
            <Detail label="Starting odometer">{usage.vehicle.startOdometer} km</Detail>
            {usage.vehicle.endOdometer != null && (
              <Detail label="Distance">{usage.vehicle.distance ?? "—"} km</Detail>
            )}
          </>
        )}
        {usage.equipment && (
          <Detail label="Initial condition">{usage.equipment.startCondition}</Detail>
        )}
      </dl>
    </Panel>
  );
}
