import { operationsApi } from "../services/operations.api";
import { useQuery } from "@tanstack/react-query";
import { ClipboardCheck } from "lucide-react";
import {
  PageHeader,
  Panel,
  Loading,
  Empty,
  ErrorNotice,
  StatusBadge,
} from "../../../shared/components/ui";
import { displayRange } from "../../../shared/utils/dates";

export function ApprovalsPage() {
  const query = useQuery({
    queryKey: ["operations", "approvals"],
    queryFn: () => operationsApi.approvals(),
  });
  return (
    <>
      <PageHeader
        title="Approval queue"
        description="Tinjau permintaan fasilitas yang memerlukan keputusan manajer."
      />
      <Panel title="Pending requests">
        {query.isPending ? (
          <Loading />
        ) : query.isError ? (
          <ErrorNotice error={query.error} />
        ) : query.data.length === 0 ? (
          <Empty
            title="No pending approvals"
            description="Semua permintaan yang masuk telah diproses."
          />
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Resource</th>
                  <th>Requested by</th>
                  <th>Schedule</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {query.data.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.facility.name}</strong>
                      <small className="cell-secondary">{item.reference}</small>
                    </td>
                    <td>{item.requester.name}</td>
                    <td>{displayRange(item.startAt, item.endAt)}</td>
                    <td>
                      <StatusBadge status={item.status} />
                    </td>
                    <td>
                      <a
                        className="button small secondary"
                        href={`/bookings/${item.id}`}
                      >
                        <ClipboardCheck size={15} /> Review
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
