import { useState, type FormEvent } from "react";
import { useParams } from "@tanstack/react-router";
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
import type { Category, Facility, Location } from "../../../shared/types/domain";
import { OperatingHoursEditor } from "../components/OperatingHoursEditor";
export function FacilityFormPage({ edit = false }: { edit?: boolean }) {
  const params = useParams({ strict: false });
  const id = "facilityId" in params ? String(params.facilityId) : "";
  const existing = useQuery({
    queryKey: ["admin", "facility", id],
    queryFn: () => api.get<Facility>(`/facilities/${id}`),
    enabled: edit,
  });
  if (edit && existing.isPending) return <Loading />;
  if (edit && existing.isError) return <ActionError error={existing.error} />;
  return (
    <FacilityEditor
      key={existing.data ? `${existing.data.id}-${existing.data.version}` : "new"}
      initial={existing.data}
    />
  );
}
function FacilityEditor({ initial }: { initial?: Facility | undefined }) {
  const queryClient = useQueryClient();
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.get<Category[]>("/facility-categories"),
  });
  const locations = useQuery({
    queryKey: ["locations"],
    queryFn: () => api.get<Location[]>("/locations"),
  });
  const [code, setCode] = useState(initial?.code ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [locationId, setLocationId] = useState(initial?.locationId ?? "");
  const [policy, setPolicy] = useState(initial?.approvalPolicy ?? "REQUIRE_APPROVAL");
  const [min, setMin] = useState(initial?.minMinutes ?? 30);
  const [max, setMax] = useState(initial?.maxMinutes ?? 480);
  const [buffer, setBuffer] = useState(initial?.bufferMinutes ?? 0);
  const [capacity, setCapacity] = useState(initial?.room?.capacity ?? 10);
  const [plate, setPlate] = useState(initial?.vehicle?.plateNumber ?? "");
  const [asset, setAsset] = useState(initial?.equipment?.assetCode ?? "");
  const [brand, setBrand] = useState(initial?.vehicle?.brand ?? initial?.equipment?.brand ?? "");
  const [model, setModel] = useState(initial?.vehicle?.model ?? initial?.equipment?.model ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [message, setMessage] = useState("");
  const selected =
    initial?.category.code ?? categories.data?.find((c) => c.id === categoryId)?.code;
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage("");
    try {
      if (initial) {
        await api.mutate(
          `/admin/facilities/${initial.id}`,
          {
            name,
            description,
            locationId,
            approvalPolicy: policy,
            minMinutes: min,
            maxMinutes: max,
            bufferMinutes: buffer,
            ...(selected === "MEETING_ROOM" ? { capacity } : {}),
            ...(selected === "VEHICLE" ? { plateNumber: plate, brand, model } : {}),
            ...(selected === "EQUIPMENT" ? { assetCode: asset, brand, model } : {}),
          },
          { method: "PATCH", version: initial.version },
        );
      } else {
        const created = await api.mutate<Facility>("/admin/facilities", {
          code,
          name,
          description,
          categoryId,
          locationId,
          approvalPolicy: policy,
          minMinutes: min,
          maxMinutes: max,
          bufferMinutes: buffer,
          ...(selected === "MEETING_ROOM" ? { capacity } : {}),
          ...(selected === "VEHICLE"
            ? { plateNumber: plate, brand, model, passengerCapacity: 4 }
            : {}),
          ...(selected === "EQUIPMENT" ? { assetCode: asset, brand, model } : {}),
        });
        window.location.assign(`/admin/facilities/${created.id}/edit`);
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["facilities"] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "facility"] });
      setMessage("Facility saved successfully.");
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  };
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
