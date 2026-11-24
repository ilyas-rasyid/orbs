import { facilityAdminApi } from "../services/facility-admin.api";
import type { OperatingWindow } from "../types/operating-window.types";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Facility } from "../../../shared/types/domain";

export function useOperatingHours({ facility }: { facility: Facility }) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["operating-windows", facility.id],
    queryFn: () => facilityAdminApi.windows(facility.id),
  });
  const [windows, setWindows] = useState<OperatingWindow[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (query.data) setWindows(query.data);
  }, [query.data]);

  function addWindow() {
    setWindows((items) => [
      ...items,
      {
        dayOfWeek: 1,
        opens: "08:00",
        closes: "18:00",
        kind: facility.category.code === "MEETING_ROOM" ? "BOOKING" : "HANDOVER",
      },
    ]);
  }

  function changeWindow(index: number, patch: Partial<OperatingWindow>) {
    setWindows((items) => items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setSuccess("");
    try {
      await facilityAdminApi.saveWindows(
        facility.id,
        windows.map(({ dayOfWeek, opens, closes, kind }) => ({
          dayOfWeek,
          opens,
          closes,
          kind,
        })),
        facility.version,
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["operating-windows", facility.id] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "facility", facility.id] }),
        queryClient.invalidateQueries({ queryKey: ["facilities"] }),
      ]);
      setSuccess("Operating hours updated.");
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  }
  return {
    query,
    windows,
    setWindows,
    error,
    success,
    busy,
    addWindow,
    changeWindow,
    save,
  };
}
