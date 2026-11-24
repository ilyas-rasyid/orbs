import { useFacilityEditor } from "../hooks/useFacilityEditor";
import {
  ActionError,
  Field,
  FormActions,
  PageHeader,
  Panel,
  SuccessNotice,
} from "../../../shared/components/ui";
import type { Facility } from "../../../shared/types/domain";
import { OperatingHoursEditor } from "./OperatingHoursEditor";

export function FacilityEditor({ initial }: { initial?: Facility | undefined }) {
  const {
    categories,
    locations,
    code,
    setCode,
    name,
    setName,
    description,
    setDescription,
    categoryId,
    setCategoryId,
    locationId,
    setLocationId,
    policy,
    setPolicy,
    min,
    setMin,
    max,
    setMax,
    buffer,
    setBuffer,
    capacity,
    setCapacity,
    plate,
    setPlate,
    asset,
    setAsset,
    brand,
    setBrand,
    model,
    setModel,
    busy,
    error,
    message,
    selected,
    submit,
  } = useFacilityEditor({ initial });
  return (
    <>
      <PageHeader
        title={initial ? `Edit ${initial.name}` : "New facility"}
        description="Atur profil fasilitas dan kebijakan pemesanan secara konsisten."
        action={
          <a
            className="button secondary"
            href="/admin/facilities"
          >
            Back to facilities
          </a>
        }
      />
      <Panel title="Facility details">
        <form
          className="form-stack"
          onSubmit={(e) => void submit(e)}
        >
          <div className="form-grid">
            <Field label="Facility code">
              <input
                required
                disabled={!!initial}
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </Field>
            <Field label="Display name">
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            {!initial && (
              <>
                <Field label="Category">
                  <select
                    required
                    value={categoryId}
                    onChange={(e) => {
                      setCategoryId(e.target.value);
                      const selectedCategory = categories.data?.find(
                        (category) => category.id === e.target.value,
                      )?.code;
                      setPolicy(
                        selectedCategory === "MEETING_ROOM" ? "AUTO_CONFIRM" : "REQUIRE_APPROVAL",
                      );
                      setMin(selectedCategory === "VEHICLE" ? 60 : 30);
                      setMax(selectedCategory === "MEETING_ROOM" ? 480 : 10080);
                      setBuffer(selectedCategory === "VEHICLE" ? 30 : 0);
                    }}
                  >
                    <option value="">Choose category</option>
                    {categories.data?.map((c) => (
                      <option
                        key={c.id}
                        value={c.id}
                      >
                        {c.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </>
            )}
            <Field label="Location">
              <select
                required
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
              >
                <option value="">Choose location</option>
                {locations.data?.map((l) => (
                  <option
                    key={l.id}
                    value={l.id}
                  >
                    {l.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Approval policy">
              <select
                value={policy}
                onChange={(e) => setPolicy(e.target.value as Facility["approvalPolicy"])}
              >
                <option value="AUTO_CONFIRM">Auto-confirm</option>
                <option value="REQUIRE_APPROVAL">Require approval</option>
              </select>
            </Field>
            <Field label="Minimum minutes">
              <input
                type="number"
                min="15"
                value={min}
                onChange={(e) => setMin(Number(e.target.value))}
              />
            </Field>
            <Field label="Maximum minutes">
              <input
                type="number"
                min="30"
                value={max}
                onChange={(e) => setMax(Number(e.target.value))}
              />
            </Field>
            <Field label="Turnaround buffer (minutes)">
              <input
                type="number"
                min="0"
                value={buffer}
                onChange={(e) => setBuffer(Number(e.target.value))}
              />
            </Field>
            <Field label="Description">
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>
            {selected === "MEETING_ROOM" && (
              <Field label="Room capacity">
                <input
                  type="number"
                  min="1"
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                />
              </Field>
            )}
            {selected === "VEHICLE" && (
              <>
                <Field label="Plate number">
                  <input
                    required
                    value={plate}
                    onChange={(e) => setPlate(e.target.value)}
                  />
                </Field>
                <Field label="Brand">
                  <input
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                  />
                </Field>
                <Field label="Model">
                  <input
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                  />
                </Field>
              </>
            )}
            {selected === "EQUIPMENT" && (
              <>
                <Field label="Asset code">
                  <input
                    required
                    value={asset}
                    onChange={(e) => setAsset(e.target.value)}
                  />
                </Field>
                <Field label="Brand">
                  <input
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                  />
                </Field>
                <Field label="Model">
                  <input
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                  />
                </Field>
              </>
            )}
          </div>
          <ActionError error={error} />
          {message && <SuccessNotice>{message}</SuccessNotice>}
          <FormActions
            busy={busy}
            text={initial ? "Save changes" : "Create facility"}
          />
        </form>
      </Panel>
      {initial && <OperatingHoursEditor facility={initial} />}
    </>
  );
}
