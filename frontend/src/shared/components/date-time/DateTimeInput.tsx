import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import {
  MONTHS,
  WEEKDAYS,
  HOURS,
  QUARTER_MINUTES,
  parseIsoParts,
  formatReadableDate,
  buildCalendarDays,
  todayIsoString,
} from "../../utils/date-time-picker";

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
