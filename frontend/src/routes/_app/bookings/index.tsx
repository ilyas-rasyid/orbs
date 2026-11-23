import { createFileRoute } from "@tanstack/react-router";
import { BookingsPage } from "../../../features/bookings/pages/BookingsPage";
export const Route = createFileRoute("/_app/bookings/")({ component: BookingsPage });
