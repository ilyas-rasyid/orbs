import { createFileRoute } from "@tanstack/react-router";
import { UserDetailPage } from "../../../../features/admin/pages/UserDetailPage";

export const Route = createFileRoute("/_app/admin/users/$userId")({ component: UserDetailPage });
