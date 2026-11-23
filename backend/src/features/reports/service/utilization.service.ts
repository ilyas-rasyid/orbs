import { prisma } from "../../../infra/prisma.js";
import { HttpError } from "../../../http/errors.js";
import { toMinutes } from "../../../shared/domain/operating-windows.js";

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const quarterHour = 15 * 60_000;

type Interval = { startAt: Date; endAt: Date };
type Window = { dayOfWeek: number; opens: string; closes: string };

function overlapMs(start: number, end: number, from: number, to: number): number {
  return Math.max(0, Math.min(end, to) - Math.max(start, from));
}

function intervalHours(intervals: Interval[], from: Date, to: Date): number {
  return (
    intervals.reduce(
      (sum, item) =>
        sum + overlapMs(item.startAt.getTime(), item.endAt.getTime(), from.getTime(), to.getTime()),
      0,
    ) / 3_600_000
  );
}

/** For rooms the configured booking windows are the capacity denominator. */
function bookableHours(
  from: Date,
  to: Date,
  windows: Window[],
  timezone: string,
  alwaysOpen: boolean,
  maintenance: Interval[],
): number {
  if (!alwaysOpen && !windows.length) return 0;
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  let totalMs = 0;
  for (let time = from.getTime(); time < to.getTime(); time += quarterHour) {
    const end = Math.min(time + quarterHour, to.getTime());
    if (!alwaysOpen) {
      const parts = Object.fromEntries(
        formatter.formatToParts(new Date((time + end) / 2)).map(({ type, value }) => [type, value]),
      );
      const weekday = weekdays.indexOf(parts.weekday ?? "");
      const localMinute = Number(parts.hour ?? 0) * 60 + Number(parts.minute ?? 0);
      if (
        !windows.some(
          (window) =>
            weekday === window.dayOfWeek &&
            localMinute >= toMinutes(window.opens) &&
            localMinute < toMinutes(window.closes),
        )
      ) {
        continue;
      }
    }
    const occupied = maintenance
      .flatMap((item) => {
        const start = Math.max(time, item.startAt.getTime());
        const finish = Math.min(end, item.endAt.getTime());
        return finish > start ? [{ start, finish }] : [];
      })
      .sort((a, b) => a.start - b.start);
    let blocked = 0;
    let lastEnd = time;
    for (const interval of occupied) {
      if (interval.finish > lastEnd) {
        blocked += interval.finish - Math.max(interval.start, lastEnd);
        lastEnd = interval.finish;
      }
    }
    totalMs += Math.max(0, end - time - blocked);
  }
  return totalMs / 3_600_000;
}

function round(value: number): number {
  return Number(value.toFixed(2));
}

export async function utilizationReport(from: Date, to: Date) {
  const settings = await prisma.organizationSetting.findFirst();
  const timezone = settings?.timezone ?? "Asia/Makassar";
  const facilities = await prisma.facility.findMany({
    include: {
      category: true,
      location: true,
      windows: { where: { active: true, kind: "BOOKING" } },
      claims: {
        where: {
          state: "ACTIVE",
          startAt: { lt: to },
          endAt: { gt: from },
          bookingId: { not: null },
        },
        include: { booking: true },
      },
      usages: {
        where: { startAt: { lt: to }, OR: [{ endAt: { gt: from } }, { endAt: null }] },
      },
      maintenances: {
        where: {
          status: { in: ["SCHEDULED", "IN_PROGRESS", "COMPLETED"] },
          startAt: { lt: to },
          endAt: { gt: from },
        },
      },
    },
    orderBy: [{ locationId: "asc" }, { name: "asc" }],
    take: 1001,
  });
  if (facilities.length > 1000) {
    throw new HttpError(
      422,
      "REPORT_TOO_LARGE",
      "Filter the report to a smaller facility selection.",
    );
  }
  const now = new Date();
  const rows = facilities.map((facility) => {
    const maintenance = facility.maintenances.map((item) => ({
      startAt: item.actualStartAt ?? item.startAt,
      endAt: item.status === "IN_PROGRESS" ? now : (item.actualEndAt ?? item.endAt),
    }));
    const capacity = bookableHours(
      from,
      to,
      facility.windows,
      timezone,
      facility.category.code !== "MEETING_ROOM" && facility.windows.length === 0,
      maintenance,
    );
    const scheduled = facility.claims.flatMap((claim) => {
      if (!claim.booking) return [];
      const end = new Date(
        Math.min(
          claim.booking.endAt.getTime(),
          claim.endAt.getTime() - claim.bufferMinutes * 60_000,
        ),
      );
      return end > claim.startAt ? [{ startAt: claim.startAt, endAt: end }] : [];
    });
    const used = facility.usages.map((usage) => ({
      startAt: usage.startAt,
      endAt: usage.endAt ?? now,
    }));
    const scheduledHours = intervalHours(scheduled, from, to);
    const actualHours = intervalHours(used, from, to);
    return {
      facility: facility.name,
      facilityCode: facility.code,
      category: facility.category.name,
      location: facility.location.name,
      capacityHours: round(capacity),
      scheduledHours: round(scheduledHours),
      actualHours: round(actualHours),
      bookedUtilizationPercent: capacity > 0 ? round((scheduledHours / capacity) * 100) : null,
      actualUtilizationPercent: capacity > 0 ? round((actualHours / capacity) * 100) : null,
    };
  });
  return {
    rows,
    summary: {
      total: rows.length,
      capacityHours: round(rows.reduce((sum, row) => sum + row.capacityHours, 0)),
      scheduledHours: round(rows.reduce((sum, row) => sum + row.scheduledHours, 0)),
      actualHours: round(rows.reduce((sum, row) => sum + row.actualHours, 0)),
    },
  };
}
