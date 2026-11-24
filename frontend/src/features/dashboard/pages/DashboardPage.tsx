import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarPlus,
  ChevronRight,
  CircleCheck,
  Clock3,
  ClipboardCheck,
  Building2,
} from "lucide-react";
import { api } from "../../../shared/api/client";
import { useAuth } from "../../../shared/auth/AuthProvider";
import {
  Empty,
  ErrorNotice,
  Loading,
  PageHeader,
  Panel,
  StatusBadge,
} from "../../../shared/components/ui";
import type { Booking } from "../../../shared/types/domain";
import { displayRange } from "../../../shared/utils/dates";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function DashboardPage() {
  const { user } = useAuth();
  const stats = useQuery({
    queryKey: ["dashboard"],
    queryFn: () =>
      api.get<{
        pending: number;
        confirmed: number;
        active: number;
        completed: number;
        facilities: number;
      }>("/dashboard"),
    staleTime: 30_000,
  });
  const recent = useQuery({
    queryKey: ["bookings", "recent"],
    queryFn: () =>
      api.get<{
        data: Booking[];
      }>("/bookings?limit=5"),
  });
  return (
    <>
      <PageHeader
        title={`${getGreeting()}, ${user?.name.split(" ")[0] ?? "there"}`}
        description="Overview of company facility activities and reservations requiring your attention."
        action={
          <a
            href="/bookings/new"
            className="button primary"
          >
            <CalendarPlus size={17} /> New booking
          </a>
        }
      />
      {stats.isPending ? (
        <Loading />
      ) : stats.isError ? (
        <ErrorNotice error={stats.error} />
      ) : (
        <div className="metric-grid">
          <Metric
            label="Pending requests"
            value={stats.data.pending}
            icon={<Clock3 size={19} />}
            href="/bookings"
          />
          <Metric
            label="Confirmed"
            value={stats.data.confirmed}
            icon={<ClipboardCheck size={19} />}
            href="/bookings"
          />
          <Metric
            label="In use"
            value={stats.data.active}
            icon={<Building2 size={19} />}
            href="/bookings"
          />
          <Metric
            label="Completed"
            value={stats.data.completed}
            icon={<CircleCheck size={19} />}
            href="/bookings"
          />
        </div>
      )}
      <div className="dashboard-columns">
        <Panel
          title="Recent bookings"
          toolbar={
            <a
              className="text-link"
              href="/bookings"
            >
              View all <ChevronRight size={14} />
            </a>
          }
        >
          {recent.isPending ? (
            <Loading />
          ) : recent.isError ? (
            <ErrorNotice error={recent.error} />
          ) : recent.data.data.length === 0 ? (
            <Empty
              title="No bookings yet"
              description="Select a facility to start a reservation."
            />
          ) : (
            <div className="compact-list">
              {recent.data.data.map((booking) => (
                <a
                  key={booking.id}
                  className="list-item"
                  href={`/bookings/${booking.id}`}
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
        <Panel title="Quick access">
          <div className="quick-links">
            <a href="/facilities">
              <Building2 size={18} />
              <div>
                <strong>Find a facility</strong>
                <small>Explore office facilities</small>
              </div>
              <ChevronRight size={15} />
            </a>
            <a href="/calendar">
              <Clock3 size={18} />
              <div>
                <strong>Availability calendar</strong>
                <small>View booking schedule</small>
              </div>
              <ChevronRight size={15} />
            </a>
            {user?.role !== "EMPLOYEE" && (
              <a href="/operations/approvals">
                <ClipboardCheck size={18} />
                <div>
                  <strong>Approval queue</strong>
                  <small>Review employee requests</small>
                </div>
                <ChevronRight size={15} />
              </a>
            )}
          </div>
        </Panel>
      </div>
    </>
  );
}
function Metric({
  label,
  value,
  icon,
  href,
}: {
  label: string;
  value: number;
  icon: ReactNode;
  href: string;
}) {
  return (
    <a
      className="metric"
      href={href}
    >
      <div className="metric-icon">{icon}</div>
      <span>{label}</span>
      <strong>{value.toLocaleString("id-ID")}</strong>
    </a>
  );
}
