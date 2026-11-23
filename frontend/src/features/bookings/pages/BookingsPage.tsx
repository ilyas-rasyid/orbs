import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarPlus, ChevronRight } from "lucide-react";
import { api } from "../../../shared/api/client";
import {
  Empty,
  ErrorNotice,
  Loading,
  PageHeader,
  Panel,
  StatusBadge,
} from "../../../shared/components/ui";
import { displayRange } from "../../../shared/utils/dates";
import type { Booking, ApiList } from "../../../shared/types/domain";
const statuses = [
  "",
  "PENDING",
  "CONFIRMED",
  "IN_USE",
  "COMPLETED",
  "CANCELLED",
  "REJECTED",
  "EXPIRED",
  "NO_SHOW",
];
export function BookingsPage() {
  const [status, setStatus] = useState("");
  const query = useQuery({
    queryKey: ["bookings", status],
    queryFn: () =>
      api.get<ApiList<Booking>>(`/bookings?limit=100${status ? `&status=${status}` : ""}`),
  });
  return (
    <>
      <PageHeader
        title="My Bookings"
        description="Kelola permintaan dan penggunaan fasilitas yang menjadi tanggung jawabmu."
        action={
          <a
            className="button primary"
            href="/bookings/new"
          >
            <CalendarPlus size={17} /> New booking
          </a>
        }
      />
      <div className="filter-bar">
        <select
          value={status}
          aria-label="Booking status"
          onChange={(e) => setStatus(e.target.value)}
        >
          {statuses.map((s) => (
            <option
              key={s}
              value={s}
            >
              {s ? s.replaceAll("_", " ") : "All statuses"}
            </option>
          ))}
        </select>
      </div>
      <Panel>
        {query.isPending ? (
          <Loading />
        ) : query.isError ? (
          <ErrorNotice error={query.error} />
        ) : query.data.data.length === 0 ? (
          <Empty
            title="Belum ada booking"
            description="Buat booking baru untuk mulai menggunakan fasilitas."
          />
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Booking</th>
                  <th>Schedule</th>
                  <th>Responsible</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {query.data.data.map((booking) => (
                  <tr key={booking.id}>
                    <td>
                      <a
                        className="cell-link"
                        href={`/bookings/${booking.id}`}
                      >
                        {booking.facility.name}
                      </a>
                      <small className="cell-secondary">{booking.reference}</small>
                    </td>
                    <td>{displayRange(booking.startAt, booking.endAt)}</td>
                    <td>{booking.responsibleUser.name}</td>
                    <td>
                      <StatusBadge status={booking.status} />
                    </td>
                    <td>
                      <a
                        className="icon-btn"
                        href={`/bookings/${booking.id}`}
                        aria-label="View booking"
                      >
                        <ChevronRight size={17} />
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
