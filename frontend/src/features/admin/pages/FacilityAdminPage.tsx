import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { api } from "../../../shared/api/client";
import {
  ActionError,
  Empty,
  Loading,
  PageHeader,
  Panel,
  StatusBadge,
} from "../../../shared/components/ui";
import type { Facility } from "../../../shared/types/domain";
export function FacilityAdminPage() {
  const facilities = useQuery({
    queryKey: ["admin", "facilities"],
    queryFn: () => api.get<Facility[]>("/admin/facilities"),
  });
  return (
    <>
      <PageHeader
        title="Facility management"
        description="Pengaturan identitas, kebijakan, dan status fasilitas perusahaan."
        action={
          <a
            className="button primary"
            href="/admin/facilities/new"
          >
            <Plus size={17} /> Add facility
          </a>
        }
      />
      <Panel>
        {facilities.isPending ? (
          <Loading />
        ) : facilities.isError ? (
          <ActionError error={facilities.error} />
        ) : facilities.data.length === 0 ? (
          <Empty title="No facilities yet" />
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Facility</th>
                  <th>Category</th>
                  <th>Location</th>
                  <th>Policy</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {facilities.data.map((f) => (
                  <tr key={f.id}>
                    <td>
                      <strong>{f.name}</strong>
                      <small className="cell-secondary">{f.code}</small>
                    </td>
                    <td>{f.category.name}</td>
                    <td>{f.location.name}</td>
                    <td>{f.approvalPolicy.replaceAll("_", " ")}</td>
                    <td>
                      <StatusBadge status={f.status} />
                    </td>
                    <td>
                      <a
                        href={`/admin/facilities/${f.id}/edit`}
                        className="button small secondary"
                      >
                        Manage
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
