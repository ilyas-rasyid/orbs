import { route, manager } from "../../../http/router.js";
import { prisma } from "../../../infra/prisma.js";
import { HttpError, assert } from "../../../http/errors.js";
import { utilizationReport } from "../service/utilization.service.js";

const supported = new Set([
  "bookings",
  "facility-utilization",
  "meeting-rooms",
  "vehicle-usage",
  "equipment-usage",
  "approvals",
  "overdue-no-show",
  "maintenance",
]);
function bounds(query: URLSearchParams) {
  const from = new Date(query.get("from") ?? new Date(Date.now() - 30 * 86400_000));
  const to = new Date(query.get("to") ?? new Date());
  assert(
    Number.isFinite(from.getTime()) &&
      Number.isFinite(to.getTime()) &&
      to > from &&
      to.getTime() - from.getTime() <= 366 * 86400_000,
    422,
    "INVALID_RANGE",
    "Select a valid range up to 366 days.",
  );
  return { from, to };
}
function csvCell(value: unknown): string {
  let text = value == null ? "" : String(value);
  const firstNonSpace = [...text].find((char) => char.charCodeAt(0) > 32);
  if (firstNonSpace && "=+-@".includes(firstNonSpace)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
function toCsv(rows: Record<string, unknown>[]): string {
  const first = rows[0];
  if (!first) return "No records\n";
  const keys = Object.keys(first);
  return `${keys.map(csvCell).join(",")}\n${rows.map((r) => keys.map((k) => csvCell(r[k])).join(",")).join("\n")}\n`;
}
async function report(type: string, query: URLSearchParams) {
  if (!supported.has(type))
    throw new HttpError(404, "RESOURCE_NOT_FOUND", "Report type unavailable.");
  const { from, to } = bounds(query);
  if (type === "facility-utilization") return utilizationReport(from, to);
  const dates = { startAt: { lt: to }, endAt: { gt: from } };
  const category =
    type === "meeting-rooms"
      ? "MEETING_ROOM"
      : type === "vehicle-usage"
        ? "VEHICLE"
        : type === "equipment-usage"
          ? "EQUIPMENT"
          : undefined;
  if (type === "maintenance") {
    const data = await prisma.maintenance.findMany({
      where: dates,
      select: {
        reference: true,
        status: true,
        reason: true,
        startAt: true,
        endAt: true,
        actualStartAt: true,
        actualEndAt: true,
        facility: { select: { name: true } },
      },
      orderBy: { startAt: "desc" },
      take: 2000,
    });
    if (data.length >= 2000)
      throw new HttpError(422, "REPORT_TOO_LARGE", "Shorten the date range.");
    return {
      rows: data.map((row) => ({
        reference: row.reference,
        facility: row.facility.name,
        status: row.status,
        reason: row.reason,
        scheduledStart: row.startAt,
        scheduledEnd: row.endAt,
        actualStart: row.actualStartAt,
        actualEnd: row.actualEndAt,
      })),
    };
  }
  const bookings = await prisma.booking.findMany({
    where: {
      ...dates,
      ...(category ? { facility: { category: { code: category } } } : {}),
    },
    include: {
      facility: { include: { category: true } },
      usage: {
        include: { vehicle: true, equipment: true },
      },
      approval: true,
    },
    orderBy: { startAt: "desc" },
    take: 5000,
  });
  if (bookings.length >= 5000)
    throw new HttpError(422, "REPORT_TOO_LARGE", "Shorten the date range.");
  const reportNow = new Date();
  const rows = bookings.map((booking) => ({
    reference: booking.reference,
    facility: booking.facility.name,
    category: booking.facility.category.code,
    status: booking.status,
    start: booking.startAt.toISOString(),
    end: booking.endAt.toISOString(),
    scheduledHours: Number(
      (
        (Math.min(booking.endAt.getTime(), to.getTime()) -
          Math.max(booking.startAt.getTime(), from.getTime())) /
        3600_000
      ).toFixed(2),
    ),
    actualHours: booking.usage
      ? Number(
          (
            Math.max(
              0,
              Math.min((booking.usage.endAt ?? reportNow).getTime(), to.getTime()) -
                Math.max(booking.usage.startAt.getTime(), from.getTime()),
            ) / 3600_000
          ).toFixed(2),
        )
      : 0,
    vehicleDistance: booking.usage?.vehicle?.distance ?? null,
    decision: booking.approval?.decision ?? null,
  }));
  const selected =
    type === "approvals"
      ? rows.filter((r) => r.decision !== null)
      : ["meeting-rooms", "vehicle-usage", "equipment-usage"].includes(type)
        ? rows.filter((r) => ["IN_USE", "COMPLETED"].includes(r.status))
        : type === "overdue-no-show"
          ? rows.filter(
              (r) =>
                r.status === "NO_SHOW" ||
                (r.status === "IN_USE" && new Date(r.end).getTime() < Date.now()),
            )
          : rows;
  const summary = {
    total: selected.length,
    completed: selected.filter((r) => r.status === "COMPLETED").length,
    confirmed: selected.filter((r) => r.status === "CONFIRMED").length,
    scheduledHours: selected.reduce((n, r) => n + r.scheduledHours, 0),
    actualHours: selected.reduce((n, r) => n + r.actualHours, 0),
    vehicleDistance: selected.reduce((n, r) => n + (r.vehicleDistance ?? 0), 0),
  };
  return { rows: selected, summary };
}
export function registerReportRoutes() {
  route("GET", "/reports/:type", async (ctx) => {
    manager(ctx);
    const type = ctx.params.type ?? "";
    const result = await report(type, ctx.query);
    return { ...result, meta: { generatedAt: new Date(), timezone: "Asia/Makassar" } };
  });
  route("GET", "/reports/:type/export", async (ctx) => {
    manager(ctx);
    const type = ctx.params.type ?? "";
    const result = await report(type, ctx.query);
    return new Response(toCsv(result.rows), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="orbs-${type}.csv"`,
      },
    });
  });
  route("GET", "/dashboard", async (ctx) => {
    const actor = ctx.actor!;
    const where = actor.role === "EMPLOYEE" ? { responsibleUserId: actor.id } : {};
    const [pending, confirmed, active, completed, facilities] = await Promise.all([
      prisma.booking.count({ where: { ...where, status: "PENDING" } }),
      prisma.booking.count({ where: { ...where, status: "CONFIRMED" } }),
      prisma.booking.count({ where: { ...where, status: "IN_USE" } }),
      prisma.booking.count({ where: { ...where, status: "COMPLETED" } }),
      prisma.facility.count({ where: { status: "ACTIVE" } }),
    ]);
    return { pending, confirmed, active, completed, facilities };
  });
}
