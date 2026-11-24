import { facilitiesApi } from "../../facilities/facilities.api";
import { FacilityEditor } from "../components/FacilityEditor";
import { useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ActionError, Loading } from "../../../shared/components/ui";

export function FacilityFormPage({ edit = false }: { edit?: boolean }) {
  const params = useParams({ strict: false });
  const id = "facilityId" in params ? String(params.facilityId) : "";
  const existing = useQuery({
    queryKey: ["admin", "facility", id],
    queryFn: () => facilitiesApi.detail(id),
    enabled: edit,
  });
  if (edit && existing.isPending) return <Loading />;
  if (edit && existing.isError) return <ActionError error={existing.error} />;
  return (
    <FacilityEditor
      key={existing.data ? `${existing.data.id}-${existing.data.version}` : "new"}
      initial={existing.data}
    />
  );
}
