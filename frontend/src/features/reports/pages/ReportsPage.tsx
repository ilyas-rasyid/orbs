import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { api } from "../../../shared/api/client";
import {
  ActionError,
  Empty,
  Field,
  Loading,
  PageHeader,
  Panel,
} from "../../../shared/components/ui";
import { localDatetime, toIso, nextCalendarDate } from "../../../shared/utils/dates";
const reports = [
  ["bookings", "Booking summary"],
  ["facility-utilization", "Facility utilization"],
  ["meeting-rooms", "Meeting rooms"],
  ["vehicle-usage", "Vehicle usage"],
  ["equipment-usage", "Equipment"],
  ["approvals", "Approvals"],
  ["overdue-no-show", "Overdue & no-show"],
  ["maintenance", "Maintenance"],
];
type Report = {
  rows: Record<string, string | number | null>[];
  summary?: {
    total: number;
    completed: number;
    scheduledHours: number;
    actualHours: number;
    vehicleDistance: number;
  };
};
export function ReportsPage() {
  const [type, setType] = useState("bookings");
  const [from, setFrom] = useState(
    localDatetime(new Date(Date.now() - 30 * 86400_000)).slice(0, 10),
  );
  const [to, setTo] = useState(localDatetime(new Date()).slice(0, 10));
  const [error, setError] = useState<unknown>(null);
  const queryString = `from=${encodeURIComponent(toIso(`${from}T00:00`))}&to=${encodeURIComponent(toIso(`${nextCalendarDate(to)}T00:00`))}`;
  const result = useQuery({
    queryKey: ["reports", type, from, to],
    queryFn: () => api.get<Report>(`/reports/${type}?${queryString}`),
  });
  const download = async () => {
    setError(null);
    try {
      await api.downloadCsv(`/reports/${type}/export?${queryString}`);
    } catch (caught) {
      setError(caught);
    }
  };
  return (
    <>
      <PageHeader
        title="Reports"
        description="Analisis data pemesanan dan penggunaan aktual dengan rentang tanggal yang jelas."
        action={
          <button
            className="button secondary"
            onClick={() => void download()}
          >
            <Download size={17} /> Export CSV
          </button>
        }
      />
      <div className="filter-bar">
        <Field label="Report type">
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            {reports.map(([value, label]) => (
              <option
                value={value}
                key={value}
              >
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="From">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </Field>
        <Field label="To">
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </Field>
      </div>
      <ActionError error={error} />
      {result.data?.summary && (
        <div className="metric-grid">
          <div className="metric">
            <span>Total</span>
            <strong>{result.data.summary.total}</strong>
          </div>
          <div className="metric">
            <span>Completed</span>
            <strong>{result.data.summary.completed}</strong>
          </div>
          <div className="metric">
            <span>Scheduled hours</span>
            <strong>{result.data.summary.scheduledHours.toFixed(1)}</strong>
          </div>
          <div className="metric">
            <span>Actual hours</span>
            <strong>{result.data.summary.actualHours.toFixed(1)}</strong>
          </div>
        </div>
      )}
      <Panel title="Report data">
        {result.isPending ? (
          <Loading />
        ) : result.isError ? (
          <ActionError error={result.error} />
        ) : result.data.rows.length === 0 ? (
          <Empty title="Tidak ada data pada periode terpilih" />
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  {Object.keys(result.data.rows[0]!).map((key) => (
                    <th key={key}>{key.replaceAll(/([A-Z])/g, " $1")}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.data.rows.slice(0, 100).map((row, index) => (
                  <tr key={index}>
                    {Object.values(row).map((value, cell) => (
                      <td key={cell}>{value ?? "—"}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {result.data && result.data.rows.length > 100 && (
          <p className="hint">100 baris pertama ditampilkan. Export CSV untuk data lainnya.</p>
        )}
      </Panel>
    </>
  );
}
