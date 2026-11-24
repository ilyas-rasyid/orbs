import { createFileRoute } from "@tanstack/react-router";
import { UsersPage } from "../../../../features/admin/pages/UsersPage";

export const Route = createFileRoute("/_app/admin/users/")({ component: UsersPage });
