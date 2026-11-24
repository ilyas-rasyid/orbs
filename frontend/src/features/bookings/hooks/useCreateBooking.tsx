import { bookingApi } from "../services/booking.api";
import { facilitiesApi } from "../../facilities/facilities.api";
import { formSchema, defaultTimes } from "../schemas/booking.schema";
import type { FormValues } from "../schemas/booking.schema";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "../../../shared/auth/AuthProvider";
import { toIso } from "../../../shared/utils/dates";
import type { Booking } from "../../../shared/types/domain";

export function useCreateBooking() {
  const { user } = useAuth();
  const preselected = new URLSearchParams(window.location.search).get("facilityId") ?? "";
  const [done, setDone] = useState<Booking | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ...defaultTimes(),
      facilityId: preselected,
      purpose: "",
      attendees: 1,
    },
  });
  const facilityId = form.watch("facilityId");
  const facilities = useQuery({
    queryKey: ["facilities", "select"],
    queryFn: () => facilitiesApi.select(),
  });
  const [responsibleSearch, setResponsibleSearch] = useState("");
  const responsibleUsers = useQuery({
    queryKey: ["directory", "responsible", responsibleSearch],
    queryFn: () => bookingApi.directory(responsibleSearch),
    enabled: user?.role !== "EMPLOYEE" && responsibleSearch.length >= 2,
  });
  const [driverSearch, setDriverSearch] = useState("");
  const drivers = useQuery({
    queryKey: ["directory", driverSearch],
    queryFn: () => bookingApi.directory(driverSearch),
    enabled: driverSearch.length >= 2,
  });
  const facility = useMemo(
    () => facilities.data?.data.find((item) => item.id === facilityId),
    [facilities.data, facilityId],
  );
  const kind = facility?.category.code;
  const submit = async (data: FormValues) => {
    setError(null);
    setBusy(true);
    try {
      const payload = {
        facilityId: data.facilityId,
        startAt: toIso(data.startAt),
        endAt: toIso(data.endAt),
        purpose: data.purpose,
        ...(user?.role !== "EMPLOYEE" && data.responsibleUserId
          ? { responsibleUserId: data.responsibleUserId }
          : {}),
        ...(kind === "MEETING_ROOM"
          ? { meetingTitle: data.meetingTitle, attendees: Number(data.attendees ?? 1) }
          : {}),
        ...(kind === "VEHICLE"
          ? {
              destination: data.destination,
              travelPurpose: data.travelPurpose,
              designatedDriverId: data.designatedDriverId,
            }
          : {}),
      };
      const result = await bookingApi.create(payload);
      setDone(result);
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  };
  return {
    user,
    done,
    error,
    busy,
    form,
    facilities,
    responsibleSearch,
    setResponsibleSearch,
    responsibleUsers,
    driverSearch,
    setDriverSearch,
    drivers,
    facility,
    kind,
    submit,
  };
}
