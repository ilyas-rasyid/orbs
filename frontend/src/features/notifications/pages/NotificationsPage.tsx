import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { api } from "../../../shared/api/client";
import { PageHeader, Panel, Empty, ErrorNotice, Loading } from "../../../shared/components/ui";
import type { Notification } from "../../../shared/types/domain";
import { displayDate, displayTime } from "../../../shared/utils/dates";
export function NotificationsPage() {
  const client = useQueryClient();
  const list = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.get<Notification[]>("/notifications"),
  });
  const read = async (id: string) => {
    await api.mutate(`/notifications/${id}/read`);
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
