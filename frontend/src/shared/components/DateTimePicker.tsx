import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight, Clock } from "lucide-react";

const MONTHS = [
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
const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const HOURS = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"));
const QUARTER_MINUTES = ["00", "15", "30", "45"];
const TIME_SLOTS_15M = HOURS.flatMap((h) => QUARTER_MINUTES.map((m) => `${h}:${m}`));

function parseIsoParts(value: string) {
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

function formatReadableDate(dateIso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) return "Select date";
  const [y = 2026, m = 1, d = 1] = dateIso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function buildCalendarDays(year: number, month: number) {
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

function todayIsoString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export type DateTimeInputProps = {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  "aria-labelledby"?: string;
};

export function DateTimeInput({
  value,
  onChange,
  required,
  disabled,
  "aria-labelledby": ariaLabelledBy,
}: DateTimeInputProps) {
  const parsed = useMemo(() => parseIsoParts(value), [value]);
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(parsed.year);
  const [viewMonth, setViewMonth] = useState(parsed.month);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setViewYear(parsed.year);
    setViewMonth(parsed.month);
  }, [parsed.year, parsed.month]);

  useEffect(() => {
    if (!open) return;
    function handleOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const cells = useMemo(() => buildCalendarDays(viewYear, viewMonth), [viewYear, viewMonth]);
  const todayIso = todayIsoString();

  function shiftMonth(delta: number) {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  }

  function selectDate(dateIso: string) {
    onChange(`${dateIso}T${parsed.hour}:${parsed.minute}`);
  }

  function selectHour(hour: string) {
    onChange(`${parsed.dateIso}T${hour}:${parsed.minute}`);
  }

  function selectMinute(minute: string) {
    onChange(`${parsed.dateIso}T${parsed.hour}:${minute}`);
  }

  return (
    <div
      className={`dt-picker ${open ? "is-open" : ""}`}
      ref={containerRef}
    >
      <input
        type="text"
        className="dt-hidden-input"
        aria-labelledby={ariaLabelledBy}
        value={value}
        required={required}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
      <div className="dt-trigger-bar">
        <button
          type="button"
          className="dt-trigger-btn"
          disabled={disabled}
          aria-expanded={open}
          onClick={() => setOpen((prev) => !prev)}
        >
          <span className="dt-trigger-date">
            <Calendar size={15} />
            <span>{formatReadableDate(parsed.dateIso)}</span>
          </span>
          <span className="dt-trigger-time">
            <Clock size={14} />
            <span>
              {parsed.hour}:{parsed.minute}
            </span>
          </span>
        </button>
      </div>

      {open && (
        <div
          className="dt-popover"
          role="dialog"
          aria-label="Choose date and time"
        >
          <div className="dt-popover-layout">
            <div className="dt-calendar-section">
              <div className="dt-cal-header">
                <button
                  type="button"
                  className="dt-nav-btn"
                  aria-label="Previous month"
                  onClick={() => shiftMonth(-1)}
                >
                  <ChevronLeft size={16} />
                </button>
                <strong className="dt-cal-title">
                  {MONTHS[viewMonth]} {viewYear}
                </strong>
                <button
                  type="button"
                  className="dt-nav-btn"
                  aria-label="Next month"
                  onClick={() => shiftMonth(1)}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
              <div className="dt-weekdays">
                {WEEKDAYS.map((day) => (
                  <span key={day}>{day}</span>
                ))}
              </div>
              <div className="dt-days-grid">
                {cells.map((cell) => {
                  const selected = cell.iso === parsed.dateIso;
                  const isToday = cell.iso === todayIso;
                  return (
                    <button
                      type="button"
                      key={cell.iso}
                      className={`dt-day-btn ${cell.outside ? "outside" : ""} ${selected ? "selected" : ""} ${isToday ? "today" : ""}`}
                      onClick={() => selectDate(cell.iso)}
                    >
                      {cell.day}
                    </button>
                  );
                })}
              </div>
              <div className="dt-cal-footer">
                <button
                  type="button"
                  className="dt-quick-btn"
                  onClick={() => {
                    const now = new Date();
                    setViewYear(now.getFullYear());
                    setViewMonth(now.getMonth());
                    selectDate(todayIso);
                  }}
                >
                  Today
                </button>
                <button
                  type="button"
                  className="dt-done-btn"
                  onClick={() => setOpen(false)}
                >
                  Done
                </button>
              </div>
            </div>

            <div className="dt-time-section">
              <div className="dt-time-header">Time (24h · 15m)</div>
              <div className="dt-time-columns">
                <div className="dt-hour-list">
                  {HOURS.map((h) => (
                    <button
                      type="button"
                      key={h}
                      className={`dt-time-chip ${parsed.hour === h ? "selected" : ""}`}
                      onClick={() => selectHour(h)}
                    >
                      {h}
                    </button>
                  ))}
                </div>
                <div className="dt-minute-list">
                  {QUARTER_MINUTES.map((m) => (
                    <button
                      type="button"
                      key={m}
                      className={`dt-time-chip ${parsed.minute === m ? "selected" : ""}`}
                      onClick={() => selectMinute(m)}
                    >
                      :{m}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export type DateInputProps = {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  "aria-labelledby"?: string;
};

export function DateInput({
  value,
  onChange,
  required,
  disabled,
  "aria-labelledby": ariaLabelledBy,
}: DateInputProps) {
  const parsed = useMemo(() => parseIsoParts(`${value}T00:00`), [value]);
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(parsed.year);
  const [viewMonth, setViewMonth] = useState(parsed.month);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setViewYear(parsed.year);
    setViewMonth(parsed.month);
  }, [parsed.year, parsed.month]);

  useEffect(() => {
    if (!open) return;
    function handleOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const cells = useMemo(() => buildCalendarDays(viewYear, viewMonth), [viewYear, viewMonth]);
  const todayIso = todayIsoString();

  function shiftMonth(delta: number) {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  }

  return (
    <div
      className={`dt-picker ${open ? "is-open" : ""}`}
      ref={containerRef}
    >
      <input
        type="text"
        className="dt-hidden-input"
        aria-labelledby={ariaLabelledBy}
        value={value}
        required={required}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
      <div className="dt-trigger-bar">
        <button
          type="button"
          className="dt-trigger-btn"
          disabled={disabled}
          aria-expanded={open}
          onClick={() => setOpen((prev) => !prev)}
        >
          <span className="dt-trigger-date">
            <Calendar size={15} />
            <span>{formatReadableDate(parsed.dateIso)}</span>
          </span>
        </button>
      </div>

      {open && (
        <div
          className="dt-popover dt-popover-date-only"
          role="dialog"
          aria-label="Choose date"
        >
          <div className="dt-calendar-section">
            <div className="dt-cal-header">
              <button
                type="button"
                className="dt-nav-btn"
                aria-label="Previous month"
                onClick={() => shiftMonth(-1)}
              >
                <ChevronLeft size={16} />
              </button>
              <strong className="dt-cal-title">
                {MONTHS[viewMonth]} {viewYear}
              </strong>
              <button
                type="button"
                className="dt-nav-btn"
                aria-label="Next month"
                onClick={() => shiftMonth(1)}
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="dt-weekdays">
              {WEEKDAYS.map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>
            <div className="dt-days-grid">
              {cells.map((cell) => {
                const selected = cell.iso === parsed.dateIso;
                const isToday = cell.iso === todayIso;
                return (
                  <button
                    type="button"
                    key={cell.iso}
                    className={`dt-day-btn ${cell.outside ? "outside" : ""} ${selected ? "selected" : ""} ${isToday ? "today" : ""}`}
                    onClick={() => {
                      onChange(cell.iso);
                      setOpen(false);
                    }}
                  >
                    {cell.day}
                  </button>
                );
              })}
            </div>
            <div className="dt-cal-footer">
              <button
                type="button"
                className="dt-quick-btn"
                onClick={() => {
                  onChange(todayIso);
                  setOpen(false);
                }}
              >
                Today
              </button>
              <button
                type="button"
                className="dt-done-btn"
                onClick={() => setOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export type TimeInputProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  "aria-labelledby"?: string;
};

export function TimeInput({
  value,
  onChange,
  disabled,
  "aria-labelledby": ariaLabelledBy,
}: TimeInputProps) {
  const options = useMemo(
    () => (TIME_SLOTS_15M.includes(value) ? TIME_SLOTS_15M : [value, ...TIME_SLOTS_15M].sort()),
    [value],
  );
  return (
    <div className="dt-time-select-wrap">
      <Clock
        size={14}
        className="dt-time-select-icon"
      />
      <select
        className="dt-time-select"
        aria-labelledby={ariaLabelledBy}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((slot) => (
          <option
            key={slot}
            value={slot}
          >
            {slot}
          </option>
        ))}
      </select>
    </div>
  );
}
