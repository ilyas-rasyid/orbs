import { useSettingsEditor } from "../hooks/useSettingsEditor";
import type { Settings } from "../types/settings.types";
import {
  ActionError,
  Field,
  FormActions,
  Panel,
  SuccessNotice,
} from "../../../shared/components/ui";

export function SettingsEditor({ settings }: { settings: Settings }) {
  const {
    name,
    setName,
    timezone,
    setTimezone,
    lead,
    setLead,
    horizon,
    setHorizon,
    noShow,
    setNoShow,
    busy,
    error,
    done,
    save,
  } = useSettingsEditor({ settings });
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
