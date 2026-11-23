import { HttpError } from "../http/errors.js";

const windowMs = 15 * 60_000;
const maxEntries = 10_000;
type Attempt = { count: number; resetAt: number };
const attempts = new Map<string, Attempt>();

/** A per-process defense for the single-node MVP. The deployment must expose only one API instance. */
function attemptKey(request: Request, email: string) {
  // Reverse proxy must strip/replace X-Real-IP. Do not trust X-Forwarded-For.
  const ip = request.headers.get("x-real-ip")?.slice(0, 80) ?? "local";
  return `${ip}:${email.trim().toLowerCase()}`;
}

function findOrCreate(key: string, now: number): Attempt {
  const existing = attempts.get(key);
  if (existing && existing.resetAt > now) return existing;
  if (attempts.size >= maxEntries) {
    for (const [name, record] of attempts) {
      if (record.resetAt <= now) attempts.delete(name);
    }
    if (attempts.size >= maxEntries) attempts.delete(attempts.keys().next().value!);
  }
  const record = { count: 0, resetAt: now + windowMs };
  attempts.set(key, record);
  return record;
}

export function checkLoginAttempts(request: Request, email: string, now = Date.now()) {
  const record = findOrCreate(attemptKey(request, email), now);
  if (record.count >= 5) {
    throw new HttpError(429, "RATE_LIMITED", "Too many sign-in attempts. Try again later.");
  }
}

export function recordLoginFailure(request: Request, email: string, now = Date.now()) {
  const record = findOrCreate(attemptKey(request, email), now);
  record.count += 1;
}

export function clearLoginFailures(request: Request, email: string) {
  attempts.delete(attemptKey(request, email));
}
