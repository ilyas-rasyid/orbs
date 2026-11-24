import { useCreateBooking } from "../hooks/useCreateBooking";
import { CalendarCheck, ArrowLeft } from "lucide-react";
import {
  ActionError,
  DateTimeInput,
  Field,
  FormActions,
  Loading,
  PageHeader,
  Panel,
} from "../../../shared/components/ui";

export function CreateBookingPage() {
  const {
    user,
    done,
    error,
    busy,
    form,
    facilities,
    responsibleSearch,
    setResponsibleSearch,
    responsibleUsers,
    driverSearch,
    setDriverSearch,
    drivers,
    facility,
    kind,
    submit,
  } = useCreateBooking();
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
