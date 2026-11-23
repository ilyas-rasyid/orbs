import type { Tx } from "../transactions.js";
import { assert } from "../../http/errors.js";

type WindowKind = "BOOKING" | "HANDOVER" | "RETURN";
type Window = {
  dayOfWeek: number;
  opens: string;
  closes: string;
  kind: string;
};

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function wallClock(instant: Date, timezone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const fields = Object.fromEntries(
    formatter.formatToParts(instant).map(({ type, value }) => [type, value]),
  );
  return {
    dayOfWeek: weekdays.indexOf(fields.weekday ?? ""),
    minutes: Number(fields.hour ?? 0) * 60 + Number(fields.minute ?? 0),
  };
}

function withinWindow(instant: Date, timezone: string, windows: Window[]) {
  const local = wallClock(instant, timezone);
  return windows.some((window) => {
    const start = toMinutes(window.opens);
    const end = toMinutes(window.closes);
    return window.dayOfWeek === local.dayOfWeek && local.minutes >= start && local.minutes < end;
  });
}

export function toMinutes(value: string): number {
  assert(
    /^([01]\d|2[0-3]):[0-5]\d$/.test(value),
    422,
    "INVALID_OPERATING_WINDOW",
    "Time must use HH:mm format.",
  );
  const [hours = 0, minutes = 0] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function validateWindows(windows: Window[]) {
  for (const window of windows) {
    assert(
      Number.isInteger(window.dayOfWeek) && window.dayOfWeek >= 0 && window.dayOfWeek <= 6,
      422,
      "INVALID_OPERATING_WINDOW",
      "Day must be between 0 (Sunday) and 6 (Saturday).",
    );
    assert(
      toMinutes(window.closes) > toMinutes(window.opens),
      422,
      "INVALID_OPERATING_WINDOW",
      "Operating window close must follow open.",
    );
    assert(
      ["BOOKING", "HANDOVER", "RETURN"].includes(window.kind),
      422,
      "INVALID_OPERATING_WINDOW",
      "Unknown operating window category.",
    );
  }
  const sorted = [...windows].sort(
    (a, b) =>
      a.dayOfWeek - b.dayOfWeek ||
      a.kind.localeCompare(b.kind) ||
      toMinutes(a.opens) - toMinutes(b.opens),
  );
  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1]!;
    const current = sorted[index]!;
    if (previous.dayOfWeek === current.dayOfWeek && previous.kind === current.kind) {
      assert(
        toMinutes(previous.closes) <= toMinutes(current.opens),
        422,
        "OVERLAPPING_OPERATING_WINDOWS",
        "Operating windows overlap.",
      );
    }
  }
}

/** Meeting rooms reserve the entire interval; asset handovers check the service time. */
export async function assertOperatingPolicy(
  tx: Tx,
  facilityId: string,
  category: string,
  startAt: Date,
  endAt: Date,
  timezone: string,
) {
  const configured = await tx.facilityOperatingWindow.findMany({
    where: { facilityId, active: true },
  });
  const bookingWindows = configured.filter((window) => window.kind === "BOOKING");
  if (category === "MEETING_ROOM") {
    assert(
      bookingWindows.length > 0,
      409,
      "OPERATING_HOURS_UNCONFIGURED",
      "Meeting room operating hours must be configured before booking.",
    );
    for (let time = startAt.getTime(); time < endAt.getTime(); time += 15 * 60_000) {
      assert(
        withinWindow(new Date(time), timezone, bookingWindows),
        422,
        "OUTSIDE_OPERATING_HOURS",
        "The requested meeting extends outside opening hours.",
      );
    }
    return;
  }
  for (const [kind, instant] of [
    ["HANDOVER", startAt],
    ["RETURN", endAt],
  ] as const satisfies ReadonlyArray<readonly [WindowKind, Date]>) {
    const serviceWindows = configured.filter((window) => window.kind === kind);
    if (!serviceWindows.length) continue;
    assert(
      withinWindow(instant, timezone, serviceWindows),
      422,
      "OUTSIDE_SERVICE_HOURS",
      `${kind} time is outside the facility service window.`,
    );
  }
}

export async function assertCurrentServiceWindow(
  tx: Tx,
  facilityId: string,
  kind: "HANDOVER" | "RETURN",
  timezone: string,
) {
  const windows = await tx.facilityOperatingWindow.findMany({
    where: { facilityId, active: true, kind },
  });
  if (!windows.length) return;
  assert(
    withinWindow(new Date(), timezone, windows),
    409,
    "OUTSIDE_SERVICE_HOURS",
    `${kind} cannot be processed outside service hours.`,
  );
}
