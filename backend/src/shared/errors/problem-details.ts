export type ProblemDetails = {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  code: string;
  request_id: string;
};

const titles: Record<number, string> = {
  400: "Bad Request",
  404: "Not Found",
  422: "Unprocessable Content",
  500: "Internal Server Error",
  503: "Service Unavailable",
};

export function createProblemDetails(input: {
  status: number;
  code: string;
  detail: string;
  instance: string;
  requestId: string;
}): ProblemDetails {
  return {
    type: `https://httpstatuses.io/${input.status}`,
    title: titles[input.status] ?? "Request Failed",
    status: input.status,
    detail: input.detail,
    instance: input.instance,
    code: input.code,
    request_id: input.requestId,
  };
}
