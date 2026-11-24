import { reportsApi } from "../services/reports.api";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { localDatetime, toIso, nextCalendarDate } from "../../../shared/utils/dates";

export function useReports() {
  const [type, setType] = useState("bookings");
  const [from, setFrom] = useState(
    localDatetime(new Date(Date.now() - 30 * 86400_000)).slice(0, 10),
  );
  const [to, setTo] = useState(localDatetime(new Date()).slice(0, 10));
  const [error, setError] = useState<unknown>(null);
  const queryString = `from=${encodeURIComponent(toIso(`${from}T00:00`))}&to=${encodeURIComponent(toIso(`${nextCalendarDate(to)}T00:00`))}`;
  const result = useQuery({
    queryKey: ["reports", type, from, to],
    queryFn: () => reportsApi.get(type, queryString),
  });
  const download = async () => {
    setError(null);
    try {
      await reportsApi.exportCsv(type, queryString);
    } catch (caught) {
      setError(caught);
    }
  };
  return {
    type,
    setType,
    from,
    setFrom,
    to,
    setTo,
    error,
    result,
    download,
  };
}
