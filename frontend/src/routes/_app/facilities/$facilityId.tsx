import { createFileRoute } from "@tanstack/react-router";
import { FacilityDetailPage } from "../../../features/facilities/pages/FacilityDetailPage";

export const Route = createFileRoute("/_app/facilities/$facilityId")({
  component: FacilityDetailPage,
});
