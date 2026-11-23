import { createFileRoute } from "@tanstack/react-router";
import { CalendarPage } from "../../features/availability/pages/CalendarPage";
export const Route = createFileRoute("/_app/calendar")({ component: CalendarPage });
