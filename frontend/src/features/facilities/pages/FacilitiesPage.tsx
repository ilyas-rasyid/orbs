import { useFacilities } from "../hooks/useFacilities";
import { Building2, CarFront, Projector, ArrowUpRight, Search } from "lucide-react";
import {
  PageHeader,
  ErrorNotice,
  Loading,
  Empty,
  StatusBadge,
} from "../../../shared/components/ui";

const icons = { MEETING_ROOM: Building2, VEHICLE: CarFront, EQUIPMENT: Projector };
export function FacilitiesPage() {
  const {
    user,
    search,
    setSearch,
    category,
    setCategory,
    location,
    setLocation,
    categories,
    locations,
    facilities,
  } = useFacilities();
  return (
    <>
      <PageHeader
        title="Facilities"
        description="Find meeting rooms, vehicles, and equipment to suit your operational needs."
        action={
          user?.role === "ADMIN" ? (
            <a
              className="button secondary"
              href="/admin/facilities"
            >
              Manage facilities
            </a>
          ) : undefined
        }
      />
      <div className="filter-bar">
        <label className="search-input">
          <Search size={17} />
          <input
            placeholder="Search facilities…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <select
          aria-label="Category filter"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">All categories</option>
          {categories.data?.map((c) => (
            <option
              value={c.code}
              key={c.id}
            >
              {c.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Location filter"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        >
          <option value="">All locations</option>
          {locations.data?.map((l) => (
            <option
              value={l.id}
              key={l.id}
            >
              {l.name}
            </option>
          ))}
        </select>
      </div>
      {facilities.isPending ? (
        <Loading />
      ) : facilities.isError ? (
        <ErrorNotice error={facilities.error} />
      ) : facilities.data.data.length === 0 ? (
        <Empty
          title="Tidak ada fasilitas sesuai filter"
          description="Coba kata kunci atau kategori lain."
        />
      ) : (
        <>
          <p className="result-count">{facilities.data.meta.total} facilities found</p>
          <div className="facility-grid">
            {facilities.data.data.map((facility) => {
              const Icon = icons[facility.category.code] ?? Building2;
              return (
                <a
                  className="facility-card"
                  key={facility.id}
                  href={`/facilities/${facility.id}`}
                >
                  <div className="facility-card-top">
                    <span className="resource-icon">
                      <Icon size={22} />
                    </span>
                    <ArrowUpRight size={17} />
                  </div>
                  <div>
                    <span className="card-eyebrow">
                      {facility.category.name} · {facility.location.name}
                    </span>
                    <h2>{facility.name}</h2>
                    <p>{facility.description || facility.code}</p>
                  </div>
                  <div className="facility-card-footer">
                    <span>
                      {facility.room
                        ? `${facility.room.capacity} seats`
                        : facility.vehicle
                          ? facility.vehicle.plateNumber
                          : (facility.equipment?.assetCode ?? "Resource")}
                    </span>
                    <StatusBadge status={facility.status} />
                  </div>
                </a>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
