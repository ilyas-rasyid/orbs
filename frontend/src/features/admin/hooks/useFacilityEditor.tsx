import { facilityAdminApi } from "../services/facility-admin.api";
import { facilitiesApi } from "../../facilities/facilities.api";
import { useState } from "react";
import type { FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Facility } from "../../../shared/types/domain";

export function useFacilityEditor({ initial }: { initial?: Facility | undefined }) {
  const queryClient = useQueryClient();
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: () => facilitiesApi.categories(),
  });
  const locations = useQuery({
    queryKey: ["locations"],
    queryFn: () => facilitiesApi.locations(),
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
        await facilityAdminApi.update(
          initial.id,
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
          initial.version,
        );
      } else {
        const created = await facilityAdminApi.create({
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
  return {
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
  };
}
