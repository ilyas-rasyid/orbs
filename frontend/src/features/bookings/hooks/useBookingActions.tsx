import { bookingApi } from "../services/booking.api";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../../shared/auth/AuthProvider";
import type { Booking } from "../../../shared/types/domain";

export function useBookingActions({ booking }: { booking: Booking }) {
  const { user } = useAuth();
  const client = useQueryClient();
  const [reason, setReason] = useState("");
  const [exceptionReason, setExceptionReason] = useState("");
  const [condition, setCondition] = useState("GOOD");
  const [odometer, setOdometer] = useState(
    booking.usage?.vehicle?.startOdometer ?? booking.facility.vehicle?.currentOdometer ?? 0,
  );
  const [driver, setDriver] = useState(booking.trip?.designatedDriverId ?? "");
  const [driverSearch, setDriverSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [message, setMessage] = useState("");

  const manager = user?.role === "FACILITY_MANAGER" || user?.role === "ADMIN";
  const own = booking.responsibleUserId === user?.id;
  const room = booking.facility.category.code === "MEETING_ROOM";
  const vehicle = booking.facility.category.code === "VEHICLE";
  const canCancel =
    (own || manager) && (booking.status === "PENDING" || booking.status === "CONFIRMED");
  const hasStarted = Date.now() >= new Date(booking.startAt).getTime();

  const drivers = useQuery({
    queryKey: ["directory", "handover", driverSearch],
    queryFn: () => bookingApi.directory(driverSearch),
    enabled: manager && vehicle && driverSearch.trim().length >= 2,
  });

  async function execute(path: string, payload: object = {}, destructive = false) {
    if (destructive && !window.confirm("Confirm this action?")) return;
    setBusy(true);
    setError(null);
    setMessage("");
    try {
      await bookingApi.action(path, payload, booking.version);
      setMessage("The action was saved successfully.");
      await Promise.all([
        client.invalidateQueries({ queryKey: ["booking", booking.id] }),
        client.invalidateQueries({ queryKey: ["bookings"] }),
        client.invalidateQueries({ queryKey: ["approval-queue"] }),
        client.invalidateQueries({ queryKey: ["active-usage"] }),
        client.invalidateQueries({ queryKey: ["dashboard"] }),
        client.invalidateQueries({ queryKey: ["calendar"] }),
      ]);
    } catch (caught) {
      setError(caught);
      await client.invalidateQueries({ queryKey: ["booking", booking.id] });
    } finally {
      setBusy(false);
    }
  }

  function operations(action: string, payload: object = {}, destructive = false) {
    return execute(`/operations/bookings/${booking.id}/${action}`, payload, destructive);
  }

  function selfAction(action: string, payload: object = {}, destructive = false) {
    return execute(`/bookings/${booking.id}/${action}`, payload, destructive);
  }
  return {
    reason,
    setReason,
    exceptionReason,
    setExceptionReason,
    condition,
    setCondition,
    odometer,
    setOdometer,
    driver,
    setDriver,
    driverSearch,
    setDriverSearch,
    busy,
    error,
    message,
    manager,
    own,
    room,
    vehicle,
    canCancel,
    hasStarted,
    drivers,
    operations,
    selfAction,
  };
}
