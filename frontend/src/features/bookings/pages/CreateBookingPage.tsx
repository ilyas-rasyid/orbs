import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarCheck, ArrowLeft } from "lucide-react";
import { api } from "../../../shared/api/client";
import { useAuth } from "../../../shared/auth/AuthProvider";
import {
  ActionError,
  DateTimeInput,
  Field,
  FormActions,
  Loading,
  PageHeader,
  Panel,
} from "../../../shared/components/ui";
import { localDatetime, toIso } from "../../../shared/utils/dates";
import type { Booking, Facility, ApiList, User } from "../../../shared/types/domain";

const formSchema = z.object({
  facilityId: z.string().min(1, "Pilih fasilitas"),
  startAt: z.string().min(1),
  endAt: z.string().min(1),
  purpose: z.string().trim().min(3, "Isi tujuan minimal 3 karakter"),
  responsibleUserId: z.string().optional(),
  meetingTitle: z.string().optional(),
  attendees: z.number().int().min(1).optional(),
  destination: z.string().optional(),
  travelPurpose: z.string().optional(),
  designatedDriverId: z.string().optional(),
});
type FormValues = z.infer<typeof formSchema>;
function defaultTimes() {
  const start = new Date(Date.now() + 90 * 60_000);
  start.setMinutes(Math.ceil(start.getMinutes() / 15) * 15, 0, 0);
  return {
    startAt: localDatetime(start),
    endAt: localDatetime(new Date(start.getTime() + 60 * 60_000)),
  };
}
export function CreateBookingPage() {
  const { user } = useAuth();
  const preselected = new URLSearchParams(window.location.search).get("facilityId") ?? "";
  const [done, setDone] = useState<Booking | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ...defaultTimes(),
      facilityId: preselected,
      purpose: "",
      attendees: 1,
    },
  });
  const facilityId = form.watch("facilityId");
  const facilities = useQuery({
    queryKey: ["facilities", "select"],
    queryFn: () => api.get<ApiList<Facility>>("/facilities?limit=100"),
  });
  const [responsibleSearch, setResponsibleSearch] = useState("");
  const responsibleUsers = useQuery({
    queryKey: ["directory", "responsible", responsibleSearch],
    queryFn: () =>
      api.get<User[]>(`/directory/users?search=${encodeURIComponent(responsibleSearch)}`),
    enabled: user?.role !== "EMPLOYEE" && responsibleSearch.length >= 2,
  });
  const [driverSearch, setDriverSearch] = useState("");
  const drivers = useQuery({
    queryKey: ["directory", driverSearch],
    queryFn: () => api.get<User[]>(`/directory/users?search=${encodeURIComponent(driverSearch)}`),
    enabled: driverSearch.length >= 2,
  });
  const facility = useMemo(
    () => facilities.data?.data.find((item) => item.id === facilityId),
    [facilities.data, facilityId],
  );
  const kind = facility?.category.code;
  const submit = async (data: FormValues) => {
    setError(null);
    setBusy(true);
    try {
      const payload = {
        facilityId: data.facilityId,
        startAt: toIso(data.startAt),
        endAt: toIso(data.endAt),
        purpose: data.purpose,
        ...(user?.role !== "EMPLOYEE" && data.responsibleUserId
          ? { responsibleUserId: data.responsibleUserId }
          : {}),
        ...(kind === "MEETING_ROOM"
          ? { meetingTitle: data.meetingTitle, attendees: Number(data.attendees ?? 1) }
          : {}),
        ...(kind === "VEHICLE"
          ? {
              destination: data.destination,
              travelPurpose: data.travelPurpose,
              designatedDriverId: data.designatedDriverId,
            }
          : {}),
      };
      const result = await api.mutate<Booking>("/bookings", payload);
      setDone(result);
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  };
  if (done)
    return (
      <>
        <PageHeader
          title="Request submitted"
          description="Permintaan booking berhasil tercatat di sistem."
        />
        <Panel>
          <div className="success-result">
            <CalendarCheck size={36} />
            <h2>{done.status === "PENDING" ? "Menunggu persetujuan" : "Booking confirmed"}</h2>
            <p>
              Nomor referensi: <strong>{done.reference}</strong>
            </p>
            <div className="form-actions">
              <a
                className="button primary"
                href={`/bookings/${done.id}`}
              >
                View booking details
              </a>
              <a
                className="button secondary"
                href="/facilities"
              >
                Back to facilities
              </a>
            </div>
          </div>
        </Panel>
      </>
    );
  return (
    <>
      <PageHeader
        title="New booking"
        description="Lengkapi kebutuhan penggunaan fasilitas dan periksa jadwal sebelum mengirim."
        action={
          <a
            href="/bookings"
            className="button secondary"
          >
            <ArrowLeft size={17} /> My bookings
          </a>
        }
      />
      {facilities.isPending ? (
        <Loading />
      ) : facilities.isError ? (
        <ActionError error={facilities.error} />
      ) : (
        <form
          className="booking-form"
          onSubmit={form.handleSubmit((data) => void submit(data))}
        >
          <Panel title="01 / Resource and schedule">
            <div className="form-grid">
              <Field label="Facility">
                <select
                  {...form.register("facilityId")}
                  required
                >
                  <option value="">Choose a facility</option>
                  {facilities.data.data.map((f) => (
                    <option
                      key={f.id}
                      value={f.id}
                    >
                      {f.name} · {f.category.name} · {f.location.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Approval policy">
                <div className="readonly-field">
                  {facility?.approvalPolicy === "AUTO_CONFIRM"
                    ? "Auto-confirm, if available"
                    : facility
                      ? "Manager approval required"
                      : "Select a facility"}
                </div>
              </Field>
              <Field label="Start (local time)">
                <DateTimeInput
                  value={form.watch("startAt")}
                  onChange={(value) =>
                    form.setValue("startAt", value, { shouldDirty: true, shouldValidate: true })
                  }
                  required
                />
              </Field>
              <Field label="End (local time)">
                <DateTimeInput
                  value={form.watch("endAt")}
                  onChange={(value) =>
                    form.setValue("endAt", value, { shouldDirty: true, shouldValidate: true })
                  }
                  required
                />
              </Field>
              <Field label="Purpose">
                <textarea
                  rows={2}
                  {...form.register("purpose")}
                  required
                  placeholder="Untuk keperluan apa fasilitas digunakan?"
                />
              </Field>
            </div>
          </Panel>
          {kind === "MEETING_ROOM" && (
            <Panel title="02 / Meeting details">
              <div className="form-grid">
                <Field label="Meeting title">
                  <input
                    {...form.register("meetingTitle")}
                    required
                    placeholder="Weekly coordination"
                  />
                </Field>
                <Field label={`Attendees · Capacity ${facility?.room?.capacity ?? "—"}`}>
                  <input
                    type="number"
                    min="1"
                    max={facility?.room?.capacity ?? undefined}
                    {...form.register("attendees", { valueAsNumber: true })}
                  />
                </Field>
              </div>
            </Panel>
          )}
          {kind === "VEHICLE" && (
            <Panel title="02 / Trip details">
              <div className="form-grid">
                <Field label="Destination">
                  <input
                    {...form.register("destination")}
                    required
                    placeholder="Destination address"
                  />
                </Field>
                <Field label="Trip purpose">
                  <input
                    {...form.register("travelPurpose")}
                    required
                    placeholder="Purpose of travel"
                  />
                </Field>
                <Field label="Find designated driver">
                  <input
                    value={driverSearch}
                    onChange={(e) => setDriverSearch(e.target.value)}
                    placeholder="Type at least 2 characters"
                  />
                </Field>
                <Field label="Designated driver">
                  <select
                    {...form.register("designatedDriverId")}
                    required
                  >
                    <option value="">Select driver</option>
                    {drivers.data?.map((person) => (
                      <option
                        key={person.id}
                        value={person.id}
                      >
                        {person.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </Panel>
          )}
          {kind === "EQUIPMENT" && (
            <Panel title="02 / Equipment handling">
              <p className="hint">
                Peralatan akan diserahkan oleh petugas setelah booking dikonfirmasi. Kondisi aset
                dicatat saat serah terima dan pengembalian.
              </p>
            </Panel>
          )}
          {user?.role !== "EMPLOYEE" && (
            <Panel title="Booking on behalf">
              <div className="form-grid">
                <Field label="Search employee">
                  <input
                    value={responsibleSearch}
                    onChange={(event) => setResponsibleSearch(event.target.value)}
                    placeholder="Enter at least 2 characters to search employees"
                  />
                </Field>
                <Field label="Responsible user">
                  <select {...form.register("responsibleUserId")}>
                    <option value="">Myself</option>
                    {responsibleUsers.data?.map((person) => (
                      <option
                        key={person.id}
                        value={person.id}
                      >
                        {person.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <p className="hint">Kosongkan untuk menggunakan akunmu sendiri.</p>
            </Panel>
          )}
          <div className="form-footer">
            <ActionError error={error} />
            {Object.keys(form.formState.errors).length > 0 && (
              <p className="form-error">Periksa input yang wajib diisi dan jadwal yang dipilih.</p>
            )}
            <FormActions
              busy={busy}
              text={
                facility?.approvalPolicy === "AUTO_CONFIRM" ? "Confirm booking" : "Submit request"
              }
              cancelHref="/facilities"
            />
          </div>
        </form>
      )}
    </>
  );
}
