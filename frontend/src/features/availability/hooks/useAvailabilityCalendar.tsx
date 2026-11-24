import { facilitiesApi } from "../../facilities/facilities.api";
import { availabilityApi } from "../services/availability.api";
import type { View } from "../types/calendar.types";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

export function useAvailabilityCalendar() {
  const selected = new URLSearchParams(window.location.search).get("facilityId") ?? "";
  const [facilityId, setFacilityId] = useState(selected);
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState<View>("week");
  const facilities = useQuery({
    queryKey: ["facilities", "calendar-options"],
    queryFn: () => facilitiesApi.select(),
  });
  const from = new Date(date);
  from.setHours(0, 0, 0, 0);
  const duration = view === "day" ? 1 : view === "week" ? 7 : 30;
  const to = new Date(from.getTime() + duration * 86400_000);
  const calendar = useQuery({
    queryKey: ["availability", view, date.toDateString(), facilityId],
    queryFn: () => availabilityApi.calendar(from, to, facilityId),
    staleTime: 15_000,
  });
  const move = (direction: number) =>
    setDate((old) => new Date(old.getTime() + direction * duration * 86400_000));
  const getName = (id: string) =>
    facilities.data?.data.find((f) => f.id === id)?.name ?? "Facility";
  const days = Array.from(
    { length: duration },
    (_, index) => new Date(from.getTime() + index * 86400_000),
  );
  return {
    facilityId,
    setFacilityId,
    setDate,
    view,
    setView,
    facilities,
    from,
    to,
    calendar,
    move,
    getName,
    days,
  };
}
