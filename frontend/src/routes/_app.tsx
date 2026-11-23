import { createFileRoute } from "@tanstack/react-router";
import { WorkspaceLayout } from "../layouts/WorkspaceLayout";
export const Route = createFileRoute("/_app")({ component: WorkspaceLayout });
