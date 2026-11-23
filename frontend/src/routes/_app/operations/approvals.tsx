import { createFileRoute } from "@tanstack/react-router";
import { ApprovalsPage } from "../../../features/operations/pages/ApprovalsPage";
export const Route = createFileRoute("/_app/operations/approvals")({ component: ApprovalsPage });
