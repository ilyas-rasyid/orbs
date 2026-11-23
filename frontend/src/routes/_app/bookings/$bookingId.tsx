import { createFileRoute } from "@tanstack/react-router";
import { BookingDetailPage } from "../../../features/bookings/pages/BookingDetailPage";
export const Route = createFileRoute("/_app/bookings/$bookingId")({ component: BookingDetailPage });
