import { organizationApi } from "../services/organization.api";
import { LocationsPanel } from "../components/LocationsPanel";
import { SettingsEditor } from "../components/SettingsEditor";
import { useQuery } from "@tanstack/react-query";
import { ActionError, Loading, PageHeader, Panel } from "../../../shared/components/ui";

export function SettingsPage() {
  const settings = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: () => organizationApi.settings(),
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
