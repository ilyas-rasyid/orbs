import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../shared/api/client";
import {
  ActionError,
  Field,
  FormActions,
  Loading,
  PageHeader,
  Panel,
  SuccessNotice,
} from "../../../shared/components/ui";
import type { Location } from "../../../shared/types/domain";
type Settings = {
  id: string;
  name: string;
  timezone: string;
  leadMinutes: number;
  horizonDays: number;
  noShowMinutes: number;
  version: number;
};
export function SettingsPage() {
  const settings = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: () => api.get<Settings>("/admin/settings"),
  });
  if (settings.isPending) return <Loading />;
  if (settings.isError) return <ActionError error={settings.error} />;
  return (
    <>
      <PageHeader
        title="Organization settings"
        description="Atur kebijakan organisasi dan master lokasi."
      />
      <div className="detail-columns">
        <SettingsEditor
          key={settings.data.version}
          settings={settings.data}
        />
        <LocationsPanel />
      </div>
      <Panel title="Other administration">
        <div className="quick-links">
          <a href="/admin/audit-logs">
            <strong>Audit logs</strong>
            <small>View operational and administrative history</small>
          </a>
          <a href="/admin/facilities">
            <strong>Facility catalog administration</strong>
            <small>Manage resource policies</small>
          </a>
        </div>
      </Panel>
    </>
  );
}
function SettingsEditor({ settings }: { settings: Settings }) {
  const client = useQueryClient();
  const [name, setName] = useState(settings.name);
  const [timezone, setTimezone] = useState(settings.timezone);
  const [lead, setLead] = useState(settings.leadMinutes);
  const [horizon, setHorizon] = useState(settings.horizonDays);
  const [noShow, setNoShow] = useState(settings.noShowMinutes);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [done, setDone] = useState(false);
  const save = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setDone(false);
    try {
      await api.mutate(
        "/admin/settings",
        { name, timezone, leadMinutes: lead, horizonDays: horizon, noShowMinutes: noShow },
        { method: "PATCH", version: settings.version },
      );
      setDone(true);
      await client.invalidateQueries({ queryKey: ["admin", "settings"] });
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Panel title="General policies">
      <form
        className="form-stack"
        onSubmit={(e) => void save(e)}
      >
        <Field label="Organization">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </Field>
        <Field label="Timezone (IANA)">
          <input
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            required
          />
        </Field>
        <Field label="Default lead (minutes)">
          <input
            type="number"
            min="0"
            value={lead}
            onChange={(e) => setLead(Number(e.target.value))}
          />
        </Field>
        <Field label="Booking horizon (days)">
          <input
            type="number"
            min="1"
            max="365"
            value={horizon}
            onChange={(e) => setHorizon(Number(e.target.value))}
          />
        </Field>
        <Field label="No-show grace (minutes)">
          <input
            type="number"
            min="0"
            value={noShow}
            onChange={(e) => setNoShow(Number(e.target.value))}
          />
        </Field>
        <ActionError error={error} />
        {done && <SuccessNotice>Settings updated.</SuccessNotice>}
        <FormActions
          busy={busy}
          text="Save settings"
        />
      </form>
    </Panel>
  );
}
function LocationsPanel() {
  const client = useQueryClient();
  const locations = useQuery({
    queryKey: ["admin", "locations"],
    queryFn: () => api.get<Location[]>("/admin/locations"),
  });
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const save = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.mutate("/admin/locations", { code, name, address });
      setCode("");
      setName("");
      setAddress("");
      await client.invalidateQueries({ queryKey: ["admin", "locations"] });
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  };
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
