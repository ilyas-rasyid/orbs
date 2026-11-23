import { useQuery } from "@tanstack/react-query";
import { getBackendReadiness } from "../api/health.service";

export function useApiHealth() {
  return useQuery({
    queryKey: ["foundation", "api-readiness"],
    queryFn: ({ signal }) => getBackendReadiness(signal),
    refetchInterval: false,
    retry: false,
  });
}
