import { facilitiesApi } from "../facilities.api";
import { useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarPlus, MapPin, ShieldCheck, Clock3 } from "lucide-react";
import {
  ErrorNotice,
  Loading,
  PageHeader,
  Panel,
  StatusBadge,
} from "../../../shared/components/ui";

export function FacilityDetailPage() {
  const { facilityId } = useParams({ from: "/_app/facilities/$facilityId" });
  const query = useQuery({
    queryKey: ["facility", facilityId],
    queryFn: () => facilitiesApi.detail(facilityId),
  });
  if (query.isPending) return <Loading />;
  if (query.isError) return <ErrorNotice error={query.error} />;
  const facility = query.data;
  return (
    <>
      <PageHeader
        title={facility.name}
        description={`${facility.category.name} · ${facility.code}`}
        action={
          facility.status === "ACTIVE" ? (
            <a
              href={`/bookings/new?facilityId=${facility.id}`}
              className="button primary"
            >
              <CalendarPlus size={17} /> Book facility
            </a>
          ) : (
            <span className="hint">This facility is not bookable.</span>
          )
        }
      />
      <div className="detail-columns">
        <Panel title="Overview">
          <dl className="detail-list">
            <div>
              <dt>Location</dt>
              <dd>
                <MapPin size={15} />
                {facility.location.name}
              </dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                <StatusBadge status={facility.status} />
              </dd>
            </div>
            <div>
              <dt>Approval</dt>
              <dd>
                <ShieldCheck size={15} />
                {facility.approvalPolicy === "AUTO_CONFIRM" ? "Auto-confirm" : "Manager approval"}
              </dd>
            </div>
            <div>
              <dt>Booking duration</dt>
              <dd>
                <Clock3 size={15} />
                {facility.minMinutes}–{facility.maxMinutes} minutes
              </dd>
            </div>
            {facility.room && (
              <>
                <div>
                  <dt>Capacity</dt>
                  <dd>{facility.room.capacity} people</dd>
                </div>
                <div>
                  <dt>Floor</dt>
                  <dd>{facility.room.floor || "—"}</dd>
                </div>
                <div>
                  <dt>Amenities</dt>
                  <dd>{facility.room.amenities.join(", ") || "—"}</dd>
                </div>
              </>
            )}
            {facility.vehicle && (
              <>
                <div>
                  <dt>Plate number</dt>
                  <dd>{facility.vehicle.plateNumber}</dd>
                </div>
                <div>
                  <dt>Model</dt>
                  <dd>
                    {facility.vehicle.brand} {facility.vehicle.model}
                  </dd>
                </div>
                <div>
                  <dt>Passenger capacity</dt>
                  <dd>{facility.vehicle.passengerCapacity}</dd>
                </div>
              </>
            )}
            {facility.equipment && (
              <div>
                <dt>Asset code</dt>
                <dd>{facility.equipment.assetCode}</dd>
              </div>
            )}
          </dl>
        </Panel>
        <Panel title="Booking information">
          <div className="info-stack">
            <p>
              Pastikan waktu pemesanan dan kebutuhanmu sudah sesuai sebelum mengirim permintaan.
            </p>
            <p>
              {facility.approvalPolicy === "AUTO_CONFIRM"
                ? "Booking bisa langsung dikonfirmasi jika slot masih tersedia."
                : "Permintaan perlu disetujui Facility Manager sebelum fasilitas dapat digunakan."}
            </p>
            <a
              className="button secondary"
              href={`/calendar?facilityId=${facility.id}`}
            >
              View availability calendar
            </a>
          </div>
        </Panel>
      </div>
    </>
  );
}
