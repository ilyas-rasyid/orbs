const requestIds = new WeakMap<Request, string>();

export function attachRequestId(request: Request): string {
  const id = crypto.randomUUID();
  requestIds.set(request, id);
  return id;
}

export function getRequestId(request: Request): string {
  return requestIds.get(request) ?? attachRequestId(request);
}
