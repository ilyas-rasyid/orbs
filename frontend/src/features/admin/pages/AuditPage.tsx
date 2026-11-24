import { useQuery } from "@tanstack/react-query";
import { api } from "../../../shared/api/client";
import { ActionError, Empty, Loading, PageHeader, Panel } from "../../../shared/components/ui";
import { displayDate, displayTime } from "../../../shared/utils/dates";

type Audit = {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string;
  actorId: string | null;
  reason: string | null;
  createdAt: string;
};
export function AuditPage() {
  const query = useQuery({
    queryKey: ["admin", "audit"],
    queryFn: () => api.get<Audit[]>("/admin/audit-logs"),
  });
  return (
    <>
      <PageHeader
        title="Audit logs"
        description="Jejak perubahan penting pada fasilitas, pengguna dan reservasi. Semua catatan read-only."
      />
      <Panel>
        {query.isPending ? (
          <Loading />
        ) : query.isError ? (
          <ActionError error={query.error} />
        ) : query.data.length === 0 ? (
          <Empty title="No audit events" />
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Resource</th>
                  <th>Actor ID</th>
                  <th>Reason</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {query.data.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <strong>{a.action.replaceAll("_", " ")}</strong>
                    </td>
                    <td>
                      <span>{a.resourceType}</span>
                      <small className="cell-secondary">{a.resourceId}</small>
                    </td>
                    <td className="monospace">{a.actorId?.slice(0, 8) ?? "SYSTEM"}</td>
                    <td>{a.reason ?? "—"}</td>
                    <td>
                      {displayDate(a.createdAt)} · {displayTime(a.createdAt)}
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
