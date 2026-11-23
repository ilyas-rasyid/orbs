import type { Elysia } from "elysia";
import { createProblemDetails } from "../shared/errors/problem-details.js";
import { getRequestId } from "./request-id.js";

export function registerErrorHandler<T extends Elysia>(app: T): T {
  return app.onError(({ code, request, set }) => {
    const status = code === "NOT_FOUND" ? 404 : code === "VALIDATION" ? 422 : 500;
    const detail =
      status === 404
        ? "The requested route does not exist."
        : status === 422
          ? "The request did not match the required schema."
          : "An unexpected server error occurred.";
    set.status = status;
    set.headers["content-type"] = "application/problem+json";
    const problem = createProblemDetails({
      status,
      code:
        status === 404
          ? "RESOURCE_NOT_FOUND"
          : status === 422
            ? "VALIDATION_FAILED"
            : "INTERNAL_ERROR",
      detail,
      instance: new URL(request.url).pathname,
      requestId: getRequestId(request),
    });
    return JSON.stringify(problem);
  }) as unknown as T;
}
