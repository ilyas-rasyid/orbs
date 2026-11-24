import { useLocationsPanel } from "../hooks/useLocationsPanel";
import { ActionError, Field, FormActions, Loading, Panel } from "../../../shared/components/ui";

export function LocationsPanel() {
  const { locations, code, setCode, name, setName, address, setAddress, busy, error, save } =
    useLocationsPanel();
  return (
    <Panel title="Office locations">
      {locations.isPending ? (
        <Loading />
      ) : locations.isError ? (
        <ActionError error={locations.error} />
      ) : (
        <div className="location-list">
          {locations.data.map((l) => (
            <div
              key={l.id}
              className="location-row"
            >
              <strong>{l.name}</strong>
              <small>
                {l.code} · {l.address || "No address"}
              </small>
            </div>
          ))}
        </div>
      )}
      <form
        className="form-stack"
        onSubmit={(e) => void save(e)}
      >
        <div className="form-grid">
          <Field label="Location code">
            <input
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </Field>
          <Field label="Name">
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field label="Address">
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </Field>
        </div>
        <ActionError error={error} />
        <FormActions
          busy={busy}
          text="Add location"
        />
      </form>
    </Panel>
  );
}
