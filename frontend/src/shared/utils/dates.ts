let organizationTimezone = "Asia/Makassar";

export function setOrganizationTimezone(value: string) {
  organizationTimezone = value;
}

export function currentTimezone() {
  return organizationTimezone;
}

function localParts(date: Date): Record<string, string> {
  return Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: organizationTimezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map(({ type, value }) => [type, value]),
  );
}

export function displayDate(date: string | Date, options: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: organizationTimezone,
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...options,
  }).format(new Date(date));
}

export function displayTime(date: string | Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: organizationTimezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(date));
}

export function displayRange(from: string, to: string) {
  return `${displayDate(from)} · ${displayTime(from)}–${displayTime(to)} (${organizationTimezone})`;
}

export function localDatetime(date: Date): string {
  const value = localParts(date);
  return `${value.year}-${value.month}-${value.day}T${value.hour}:${value.minute}`;
}

/** Convert wall-clock input from the organization timezone to an absolute timestamp. */
export function toIso(value: string): string {
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(value)) {
    throw new Error("Choose a valid local date and time.");
  }
  const [year = 0, month = 1, day = 1, hour = 0, minute = 0] = value.match(/\d+/g)!.map(Number);
  const target = Date.UTC(year, month - 1, day, hour, minute);
  let guess = target;
  for (let iteration = 0; iteration < 4; iteration += 1) {
    const found = localParts(new Date(guess));
    const observed = Date.UTC(
      Number(found.year),
      Number(found.month) - 1,
      Number(found.day),
      Number(found.hour),
      Number(found.minute),
    );
    const difference = observed - target;
    if (!difference) break;
    guess -= difference;
  }
  const found = localParts(new Date(guess));
  const equivalent = `${found.year}-${found.month}-${found.day}T${found.hour}:${found.minute}`;
  if (equivalent !== value)
    throw new Error("This local time is invalid in the organization timezone.");
  return new Date(guess).toISOString();
}

export function nextCalendarDate(value: string) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

export function statusLabel(value: string): string {
  const labels: Record<string, string> = {
    PENDING: "Pending approval",
    CONFIRMED: "Confirmed",
    IN_USE: "In use",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
    REJECTED: "Rejected",
    NO_SHOW: "No-show",
    EXPIRED: "Expired",
    SCHEDULED: "Scheduled",
    IN_PROGRESS: "In progress",
    ACTIVE: "Active",
    INACTIVE: "Inactive",
  };
  return labels[value] ?? value.split("_").join(" ").toLowerCase();
}
