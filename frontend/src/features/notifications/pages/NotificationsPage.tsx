import { notificationsApi } from "../services/notifications.api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { PageHeader, Panel, Empty, ErrorNotice, Loading } from "../../../shared/components/ui";
import { displayDate, displayTime } from "../../../shared/utils/dates";

export function NotificationsPage() {
  const client = useQueryClient();
  const list = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationsApi.list(),
  });
  const read = async (id: string) => {
    await notificationsApi.read(id);
    await client.invalidateQueries({ queryKey: ["notifications"] });
  };
  return (
    <>
      <PageHeader
        title="Notifications"
        description="Pemberitahuan mengenai permintaan dan perubahan status fasilitas."
      />
      <Panel>
        {list.isPending ? (
          <Loading />
        ) : list.isError ? (
          <ErrorNotice error={list.error} />
        ) : list.data.length === 0 ? (
          <Empty title="Belum ada notifikasi" />
        ) : (
          <div className="compact-list">
            {list.data.map((n) => (
              <div
                className={`list-item notification-item ${!n.readAt ? "unread" : ""}`}
                key={n.id}
              >
                <span className="resource-icon compact">
                  <Bell size={17} />
                </span>
                <div className="grow">
                  <strong>{n.title}</strong>
                  <p>{n.message}</p>
                  <small>
                    {displayDate(n.createdAt)} · {displayTime(n.createdAt)}
                  </small>
                </div>
                {n.resourceType === "Booking" && n.resourceId && (
                  <a
                    className="button small secondary"
                    href={`/bookings/${n.resourceId}`}
                  >
                    View
                  </a>
                )}
                {!n.readAt && (
                  <button
                    className="button small secondary"
                    onClick={() => void read(n.id)}
                  >
                    Mark read
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Panel>
    </>
  );
}
