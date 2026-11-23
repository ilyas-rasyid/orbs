export type ApiProblem = {
  status: number;
  code: string;
  detail: string;
  field_errors?: Record<string, string>;
};
export class ApiError extends Error {
  status: number;
  code: string;
  fields: Record<string, string>;
  constructor(problem: ApiProblem) {
    super(problem.detail || "The request could not be completed.");
    this.status = problem.status;
    this.code = problem.code;
    this.fields = problem.field_errors ?? {};
  }
}
let csrf = "";
export function setCsrf(token: string) {
  csrf = token;
}
export function resetCsrf() {
  csrf = "";
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/v1${path}`, {
    credentials: "same-origin",
    cache: "no-store",
    ...options,
    headers: {
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const type = response.headers.get("content-type") ?? "";
  if (!response.ok) {
    if (type.includes("json")) throw new ApiError((await response.json()) as ApiProblem);
    throw new ApiError({
      status: response.status,
      code: "NETWORK_ERROR",
      detail: "The server rejected this request.",
    });
  }
  if (type.includes("text/csv")) return (await response.text()) as T;
  const payload = (await response.json()) as { data: T; meta?: unknown };
  if (payload.meta && Array.isArray(payload.data)) return payload as T;
  return payload.data;
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) => request<T>(path, signal ? { signal } : {}),
  async csrf() {
    const data = await request<{ csrf: string }>("/auth/csrf");
    setCsrf(data.csrf);
    return data.csrf;
  },
  async mutate<T>(
    path: string,
    body: object = {},
    options: { method?: "POST" | "PATCH" | "PUT"; version?: number; key?: string } = {},
  ): Promise<T> {
    if (!csrf) await api.csrf();
    return request<T>(path, {
      method: options.method ?? "POST",
      body: JSON.stringify(body),
      headers: {
        "x-csrf-token": csrf,
        "idempotency-key": options.key ?? crypto.randomUUID(),
        ...(options.version === undefined ? {} : { "if-match": `"${options.version}"` }),
      },
    });
  },
  async login(email: string, password: string) {
    const token = await api.csrf();
    const result = await request<{ user: import("../types/domain").User; csrf: string }>(
      "/auth/login",
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-csrf-token": token },
        body: JSON.stringify({ email, password }),
      },
    );
    setCsrf(result.csrf);
    return result.user;
  },
  async downloadCsv(path: string): Promise<void> {
    const text = await api.get<string>(path);
    const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "orbs-report.csv";
    a.click();
    URL.revokeObjectURL(url);
  },
};
