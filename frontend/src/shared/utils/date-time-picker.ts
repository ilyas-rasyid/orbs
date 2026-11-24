export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export const HOURS = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"));

export const QUARTER_MINUTES = ["00", "15", "30", "45"];

export const TIME_SLOTS_15M = HOURS.flatMap((h) => QUARTER_MINUTES.map((m) => `${h}:${m}`));

export function parseIsoParts(value: string) {
  const [datePart = "", timePart = "09:00"] = value.split("T");
  const [yStr = "", mStr = "", dStr = ""] = datePart.split("-");
  const now = new Date();
  const year = Number(yStr) || now.getFullYear();
  const month = (Number(mStr) || now.getMonth() + 1) - 1;
  const day = Number(dStr) || now.getDate();
  const [hStr = "09", minStr = "00"] = timePart.split(":");
  const hour = String(Math.min(23, Math.max(0, Number(hStr) || 0))).padStart(2, "0");
  const rawMin = Number(minStr) || 0;
  const snappedMin = String(Math.floor(rawMin / 15) * 15).padStart(2, "0");
  return {
    year,
    month,
    day,
    hour,
    minute: QUARTER_MINUTES.includes(minStr) ? minStr : snappedMin,
    dateIso: /^\d{4}-\d{2}-\d{2}$/.test(datePart)
      ? datePart
      : `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
  };
}

export function formatReadableDate(dateIso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) return "Select date";
  const [y = 2026, m = 1, d = 1] = dateIso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function buildCalendarDays(year: number, month: number) {
  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();
  const cells: { iso: string; day: number; outside: boolean }[] = [];

  for (let i = startWeekday - 1; i >= 0; i -= 1) {
    const d = daysInPrev - i;
    const prevDate = new Date(year, month - 1, d);
    const iso = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}-${String(prevDate.getDate()).padStart(2, "0")}`;
    cells.push({ iso, day: d, outside: true });
  }
  for (let d = 1; d <= daysInMonth; d += 1) {
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ iso, day: d, outside: false });
  }
  const remaining = (7 - (cells.length % 7)) % 7;
  for (let d = 1; d <= remaining; d += 1) {
    const nextDate = new Date(year, month + 1, d);
    const iso = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}-${String(nextDate.getDate()).padStart(2, "0")}`;
    cells.push({ iso, day: d, outside: true });
  }
  return cells;
}

export function todayIsoString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
