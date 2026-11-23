import { useApiHealth } from "../hooks/use-api-health";

export function ApiHealthPanel() {
  const { data, isPending, isFetching, isError, refetch } = useApiHealth();
  const healthy = !isPending && !isError && data?.status === "ok";
  const label = isPending ? "Checking" : healthy ? "Connected" : "Unavailable";

  return (
    <section
      className="health-panel"
      aria-labelledby="health-heading"
    >
      <div className="section-heading">
        <div>
          <h2 id="health-heading">Backend readiness</h2>
          <p>Live response from the API and its PostgreSQL connection.</p>
        </div>
        <span className={`connection-status ${healthy ? "is-ready" : "is-down"}`}>
          <span
            className="connection-dot"
            aria-hidden="true"
          />
          {label}
        </span>
      </div>

      <div className="health-detail">
        <div>
          <div className="field-label">Endpoint</div>
          <code>/health/ready</code>
        </div>
        <div>
          <div className="field-label">State</div>
          <strong>{isPending ? "Loading" : healthy ? "Database reachable" : "Not ready"}</strong>
        </div>
      </div>

      {isError && (
        <p
          className="health-note"
          role="status"
        >
          API or PostgreSQL is not reachable. Start both services and check again.
        </p>
      )}

      <button
        className="refresh-button"
        type="button"
        disabled={isFetching}
        onClick={() => void refetch()}
      >
        {isFetching ? "Checking…" : "Check again"}
      </button>
    </section>
  );
}
