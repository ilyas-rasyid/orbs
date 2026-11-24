import { useAvailabilityCalendar } from "../hooks/useAvailabilityCalendar";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Empty,
  ErrorNotice,
  Loading,
  PageHeader,
  Panel,
  StatusBadge,
} from "../../../shared/components/ui";
import { displayDate, displayTime, currentTimezone } from "../../../shared/utils/dates";

export function CalendarPage() {
  const {
    facilityId,
    setFacilityId,
    setDate,
    view,
    setView,
    facilities,
    from,
    to,
    calendar,
    move,
    getName,
    days,
  } = useAvailabilityCalendar();
  return (
    <>
      <PageHeader
        title="Availability calendar"
        description="Lihat reservasi terkonfirmasi dan jadwal maintenance berdasarkan waktu organisasi."
        action={
          <a
            href={facilityId ? `/bookings/new?facilityId=${facilityId}` : "/bookings/new"}
            className="button primary"
          >
            New booking
          </a>
        }
      />
      <div className="calendar-toolbar">
        <select
          aria-label="Facility"
          value={facilityId}
          onChange={(e) => setFacilityId(e.target.value)}
        >
          <option value="">All facilities</option>
          {facilities.data?.data.map((f) => (
            <option
              value={f.id}
              key={f.id}
            >
              {f.name}
            </option>
          ))}
        </select>
        <div className="calendar-nav">
          <button
            className="icon-btn"
            aria-label="Previous"
            onClick={() => move(-1)}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            className="button small secondary"
            onClick={() => setDate(new Date())}
          >
            Today
          </button>
          <strong>
            {displayDate(from)} — {displayDate(to)}
          </strong>
          <button
            className="icon-btn"
            aria-label="Next"
            onClick={() => move(1)}
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="segmented">
          {(["day", "week", "month"] as const).map((item) => (
            <button
              key={item}
              className={view === item ? "active" : ""}
              onClick={() => setView(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      <Panel>
        {calendar.isPending ? (
          <Loading />
        ) : calendar.isError ? (
          <ErrorNotice error={calendar.error} />
        ) : (
          <div className="agenda">
            {days.map((day) => {
              const entries = calendar.data.claims.filter(
                (claim) =>
                  new Date(claim.startAt) < new Date(day.getTime() + 86400_000) &&
                  new Date(claim.endAt) > day,
              );
              return (
                <div
                  className="agenda-day"
                  key={day.toISOString()}
                >
                  <div className="agenda-date">{displayDate(day, { weekday: "short" })}</div>
                  <div className="agenda-events">
                    {entries.length === 0 ? (
                      <div className="agenda-free">No confirmed reservations</div>
                    ) : (
                      entries.map((entry) => (
                        <div
                          className="agenda-event"
                          key={entry.id}
                        >
                          <div>
                            <strong>{getName(entry.facilityId)}</strong>
                            <small>
                              {displayTime(entry.startAt)}–{displayTime(entry.endAt)} (
                              {currentTimezone()}) · {entry.responsible ?? "Maintenance"}
                            </small>
                          </div>
                          <StatusBadge status={entry.status} />
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {calendar.data && calendar.data.claims.length === 0 && (
          <Empty
            title="No blocking reservations"
            description="Unblocked slots are re-verified for scheduling conflicts upon booking submission."
          />
        )}
      </Panel>
    </>
  );
}
