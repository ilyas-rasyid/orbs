import { createFileRoute } from "@tanstack/react-router";
import { AuditPage } from "../../../features/admin/pages/AuditPage";

export const Route = createFileRoute("/_app/admin/audit-logs")({ component: AuditPage });
