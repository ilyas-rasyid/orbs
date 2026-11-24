import { organizationApi } from "../services/organization.api";
import type { Settings } from "../types/settings.types";
import { useState } from "react";
import type { FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function useSettingsEditor({ settings }: { settings: Settings }) {
  const client = useQueryClient();
  const [name, setName] = useState(settings.name);
  const [timezone, setTimezone] = useState(settings.timezone);
  const [lead, setLead] = useState(settings.leadMinutes);
  const [horizon, setHorizon] = useState(settings.horizonDays);
  const [noShow, setNoShow] = useState(settings.noShowMinutes);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [done, setDone] = useState(false);
  const save = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setDone(false);
    try {
      await organizationApi.updateSettings(
        { name, timezone, leadMinutes: lead, horizonDays: horizon, noShowMinutes: noShow },
        settings.version,
      );
      setDone(true);
      await client.invalidateQueries({ queryKey: ["admin", "settings"] });
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  };
  return {
    name,
    setName,
    timezone,
    setTimezone,
    lead,
    setLead,
    horizon,
    setHorizon,
    noShow,
    setNoShow,
    busy,
    error,
    done,
    save,
  };
}
