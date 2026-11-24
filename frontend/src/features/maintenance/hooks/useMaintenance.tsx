import { facilitiesApi } from "../../facilities/facilities.api";
import { maintenanceApi } from "../services/maintenance.api";
import { useState } from "react";
import type { FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Maintenance } from "../../../shared/types/domain";
import { localDatetime, toIso } from "../../../shared/utils/dates";

export function useMaintenance() {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["maintenance"],
    queryFn: () => maintenanceApi.list(),
  });
  const facilities = useQuery({
    queryKey: ["facilities", "maintenance-options"],
    queryFn: () => facilitiesApi.select(),
  });
  const [open, setOpen] = useState(false);
  const [facilityId, setFacilityId] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [start, setStart] = useState(() => {
    const date = new Date(Date.now() + 86400_000);
    date.setMinutes(Math.ceil(date.getMinutes() / 15) * 15, 0, 0);
    return localDatetime(date);
  });
  const [end, setEnd] = useState(() => {
    const date = new Date(Date.now() + 90000_000);
    date.setMinutes(Math.ceil(date.getMinutes() / 15) * 15, 0, 0);
    return localDatetime(date);
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [message, setMessage] = useState("");
  const create = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await maintenanceApi.create({
        facilityId,
        reason,
        notes,
        startAt: toIso(start),
        endAt: toIso(end),
      });
      await client.invalidateQueries({ queryKey: ["maintenance"] });
      setOpen(false);
      setMessage("Maintenance scheduled.");
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  };
  const transition = async (item: Maintenance, verb: "start" | "complete" | "cancel") => {
    if (verb === "cancel" && !window.confirm(`Cancel maintenance ${item.reference}?`)) return;
    setBusy(true);
    setError(null);
    setMessage("");
    try {
      await maintenanceApi.transition(item.id, verb, item.version);
      await client.invalidateQueries({ queryKey: ["maintenance"] });
      setMessage(`Maintenance ${verb} processed.`);
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  };
  return {
    query,
    facilities,
    open,
    setOpen,
    facilityId,
    setFacilityId,
    reason,
    setReason,
    notes,
    setNotes,
    start,
    setStart,
    end,
    setEnd,
    busy,
    error,
    message,
    create,
    transition,
  };
}
