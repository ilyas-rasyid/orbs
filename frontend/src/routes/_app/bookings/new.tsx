import { createFileRoute } from "@tanstack/react-router";
import { CreateBookingPage } from "../../../features/bookings/pages/CreateBookingPage";

export const Route = createFileRoute("/_app/bookings/new")({ component: CreateBookingPage });
