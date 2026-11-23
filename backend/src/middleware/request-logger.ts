export type LogLevel = "debug" | "info" | "warn" | "error";

export function logRequest(input: {
  method: string;
  path: string;
  status: number;
  requestId: string;
  durationMs: number;
  level: LogLevel;
}): void {
  if (input.level === "error" && input.status < 500) return;
  const record = {
    timestamp: new Date().toISOString(),
    level: input.status >= 500 ? "error" : "info",
    service: "orbs-api",
    request_id: input.requestId,
    method: input.method,
    route: input.path,
    status_code: input.status,
    duration_ms: Math.round(input.durationMs),
  };
  console.log(JSON.stringify(record));
}
