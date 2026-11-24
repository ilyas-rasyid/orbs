import { organizationApi } from "../services/organization.api";
import { useState } from "react";
import type { FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export function useLocationsPanel() {
  const client = useQueryClient();
  const locations = useQuery({
    queryKey: ["admin", "locations"],
    queryFn: () => organizationApi.locations(),
  });
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const save = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await organizationApi.createLocation(code, name, address);
      setCode("");
      setName("");
      setAddress("");
      await client.invalidateQueries({ queryKey: ["admin", "locations"] });
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  };
  return {
    locations,
    code,
    setCode,
    name,
    setName,
    address,
    setAddress,
    busy,
    error,
    save,
  };
}
