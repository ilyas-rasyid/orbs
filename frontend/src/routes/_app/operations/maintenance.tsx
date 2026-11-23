import { createFileRoute } from "@tanstack/react-router";
import { MaintenancePage } from "../../../features/maintenance/pages/MaintenancePage";
export const Route = createFileRoute("/_app/operations/maintenance")({
  component: MaintenancePage,
});
