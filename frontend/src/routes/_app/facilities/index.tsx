import { createFileRoute } from "@tanstack/react-router";
import { FacilitiesPage } from "../../../features/facilities/pages/FacilitiesPage";
export const Route = createFileRoute("/_app/facilities/")({ component: FacilitiesPage });
