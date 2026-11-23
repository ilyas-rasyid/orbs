import { createFileRoute } from "@tanstack/react-router";
import { FacilityAdminPage } from "../../../../features/admin/pages/FacilityAdminPage";
export const Route = createFileRoute("/_app/admin/facilities/")({ component: FacilityAdminPage });
