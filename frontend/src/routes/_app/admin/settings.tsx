import { createFileRoute } from "@tanstack/react-router";
import { SettingsPage } from "../../../features/admin/pages/SettingsPage";

export const Route = createFileRoute("/_app/admin/settings")({ component: SettingsPage });
