import { operationsApi } from "../services/operations.api";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeftRight, ChevronRight, AlertTriangle } from "lucide-react";
import {
  PageHeader,
  Panel,
  ErrorNotice,
  Loading,
  Empty,
  StatusBadge,
} from "../../../shared/components/ui";
import { displayRange, displayDate } from "../../../shared/utils/dates";
import type { Booking } from "../../../shared/types/domain";

type Active = { id: string; bookingId: string; startAt: string; booking: Booking };
export function UsagePage() {
  const active = useQuery({
    queryKey: ["operations", "usage"],
    queryFn: () => operationsApi.usage<Active[]>(),
    refetchInterval: 60_000,
  });
  const queue = useQuery({
    queryKey: ["operations", "handover"],
    queryFn: () => operationsApi.handoverQueue(),
    refetchInterval: 60_000,
  });
  return (
    <>
      <PageHeader
        title="Handover & return"
        description="Monitor active facility usage and the handover process for vehicles and equipment."
      />
      <div className="stacked-panels">
        <Panel title="Currently in use">
          {active.isPending ? (
            <Loading />
          ) : active.isError ? (
            <ErrorNotice error={active.error} />
          ) : active.data.length === 0 ? (
            <Empty title="No facilities currently in use" />
          ) : (
            <div className="compact-list">
              {active.data.map((session) => {
                const overdue = Date.now() > new Date(session.booking.endAt).getTime();
                return (
                  <a
                    href={`/bookings/${session.bookingId}`}
                    className="list-item"
                    key={session.id}
                  >
                    <span className="resource-icon compact">
                      <ArrowLeftRight size={18} />
                    </span>
                    <div>
                      <strong>{session.booking.facility.name}</strong>
                      <small>Expected return: {displayDate(session.booking.endAt)}</small>
                    </div>
                    {overdue ? (
                      <span className="overdue">
                        <AlertTriangle size={15} /> Overdue
                      </span>
                    ) : (
                      <StatusBadge status="IN_USE" />
                    )}
                    <ChevronRight size={16} />
                  </a>
                );
              })}
            </div>
          )}
        </Panel>
        <Panel title="Awaiting handover">
          {queue.isPending ? (
            <Loading />
          ) : queue.isError ? (
            <ErrorNotice error={queue.error} />
          ) : queue.data.length === 0 ? (
            <Empty title="No handovers pending" />
          ) : (
            <div className="compact-list">
              {queue.data.map((booking) => (
                <a
                  href={`/bookings/${booking.id}`}
                  className="list-item"
                  key={booking.id}
                >
                  <div>
                    <strong>{booking.facility.name}</strong>
                    <small>{displayRange(booking.startAt, booking.endAt)}</small>
                  </div>
                  <StatusBadge status={booking.status} />
                  <ChevronRight size={16} />
                </a>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
