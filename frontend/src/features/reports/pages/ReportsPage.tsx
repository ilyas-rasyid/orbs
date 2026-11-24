import { useReports } from "../hooks/useReports";
import { Download } from "lucide-react";
import {
  ActionError,
  DateInput,
  Empty,
  Field,
  Loading,
  PageHeader,
  Panel,
} from "../../../shared/components/ui";

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
export function ReportsPage() {
  const { type, setType, from, setFrom, to, setTo, error, result, download } = useReports();
  return (
    <>
      <PageHeader
        title="Reports"
        description="Analyze booking trends and actual utilization across clear date ranges."
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
          <DateInput
            value={from}
            onChange={setFrom}
          />
        </Field>
        <Field label="To">
          <DateInput
            value={to}
            onChange={setTo}
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
          <Empty title="No records found for the selected period" />
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
          <p className="hint">First 100 rows displayed. Export CSV for complete records.</p>
        )}
      </Panel>
    </>
  );
}
