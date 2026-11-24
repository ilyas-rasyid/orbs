import { createFileRoute } from "@tanstack/react-router";
import { UsagePage } from "../../../features/operations/pages/UsagePage";

export const Route = createFileRoute("/_app/operations/usage")({ component: UsagePage });
