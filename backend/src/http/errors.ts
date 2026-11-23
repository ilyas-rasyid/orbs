import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fieldErrors?: Record<string, string>,
  ) {
    super(message);
  }
}

export function assert(
  condition: unknown,
  status: number,
  code: string,
  message: string,
): asserts condition {
  if (!condition) throw new HttpError(status, code, message);
}

export function formatError(error: unknown, path: string, requestId: string): Response {
  let issue: HttpError;
  if (error instanceof HttpError) {
    issue = error;
  } else if (error instanceof ZodError) {
    const fields = Object.fromEntries(
      error.issues.map((item) => [item.path.join("."), item.message]),
    );
    issue = new HttpError(422, "VALIDATION_FAILED", "Correct the highlighted fields.", fields);
  } else {
    const database = typeof error === "object" && error !== null && "code" in error;
    const code = database ? String((error as { code: unknown }).code) : "";
    const message = error instanceof Error ? error.message : "";
    const isConflict =
      code === "P2002" ||
      code === "23P01" ||
      code === "23505" ||
      message.includes("resource_time_claim_no_overlap") ||
      message.includes("usage_session_one_active_per_facility") ||
      message.includes("23P01");
    issue = isConflict
      ? new HttpError(409, "RESOURCE_CONFLICT", "A conflicting record already exists.")
      : new HttpError(500, "INTERNAL_ERROR", "An unexpected error occurred.");
    console.error(JSON.stringify({ level: "error", code: issue.code, requestId }));
  }
  const title = issue.status >= 500 ? "Server error" : "Request rejected";
  return new Response(
    JSON.stringify({
      type: `https://orbs.example/errors/${issue.code.toLowerCase()}`,
      title,
      status: issue.status,
      detail: issue.message,
      instance: path,
      code: issue.code,
      request_id: requestId,
      ...(issue.fieldErrors ? { field_errors: issue.fieldErrors } : {}),
    }),
    {
      status: issue.status,
      headers: { "content-type": "application/problem+json", "cache-control": "no-store" },
    },
  );
}
