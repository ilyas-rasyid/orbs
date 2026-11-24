import { useMemo } from "react";
import { Clock } from "lucide-react";
import { TIME_SLOTS_15M } from "../../utils/date-time-picker";

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
