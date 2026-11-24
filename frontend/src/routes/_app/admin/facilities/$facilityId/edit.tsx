import { createFileRoute } from "@tanstack/react-router";
import { FacilityFormPage } from "../../../../../features/admin/pages/FacilityFormPage";

export const Route = createFileRoute("/_app/admin/facilities/$facilityId/edit")({
  component: () => <FacilityFormPage edit />,
});
