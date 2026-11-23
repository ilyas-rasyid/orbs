export type HealthResult = {
  status: "ok" | "unavailable";
  service: string;
  checked_at: string;
  request_id?: string;
};

export async function getBackendReadiness(signal?: AbortSignal): Promise<HealthResult> {
  const response = await fetch("/health/ready", {
    method: "GET",
    credentials: "same-origin",
    ...(signal ? { signal } : {}),
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`API readiness returned HTTP ${response.status}`);
  }

  const data: unknown = await response.json();
  if (typeof data !== "object" || data === null || !("status" in data) || data.status !== "ok") {
    throw new Error("API returned an invalid readiness response");
  }

  return data as HealthResult;
}
