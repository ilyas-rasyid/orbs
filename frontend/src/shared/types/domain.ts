export type Role = "EMPLOYEE" | "FACILITY_MANAGER" | "ADMIN";
export type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "REJECTED"
  | "CANCELLED"
  | "IN_USE"
  | "COMPLETED"
  | "NO_SHOW"
  | "EXPIRED";
export type CategoryCode = "MEETING_ROOM" | "VEHICLE" | "EQUIPMENT";
export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  status?: string;
  employeeCode?: string;
  department?: { name: string } | null;
  version?: number;
  mustChangePassword?: boolean;
};
export type Location = { id: string; code: string; name: string; address: string; active: boolean };
export type Category = { id: string; code: CategoryCode; name: string };
export type Facility = {
  id: string;
  code: string;
  name: string;
  description: string;
  categoryId: string;
  category: Category;
  locationId: string;
  location: Location;
  status: string;
  approvalPolicy: "AUTO_CONFIRM" | "REQUIRE_APPROVAL";
  minMinutes: number;
  maxMinutes: number;
  bufferMinutes: number;
  leadMinutes: number;
  version: number;
  room?: { capacity: number; floor: string; amenities: string[] } | null;
  vehicle?: {
    plateNumber: string;
    brand: string;
    model: string;
    passengerCapacity: number;
    currentOdometer: number;
  } | null;
  equipment?: { assetCode: string; brand: string; model: string; currentCondition: string } | null;
};
export type Booking = {
  id: string;
  reference: string;
  facilityId: string;
  facility: Facility;
  requesterId: string;
  responsibleUserId: string;
  responsibleUser: { id: string; name: string };
  requester: { id: string; name: string };
  createdById: string;
  status: BookingStatus;
  purpose: string;
  startAt: string;
  endAt: string;
  version: number;
  createdAt: string;
  meeting?: { title: string; attendees: number } | null;
  trip?: { destination: string; travelPurpose: string; designatedDriverId: string } | null;
  approval?: { decision: string; reason?: string; approverId: string } | null;
  usage?: {
    id: string;
    state: string;
    startAt: string;
    endAt?: string | null;
    vehicle?: { startOdometer: number; endOdometer?: number; distance?: number };
    equipment?: { startCondition: string; endCondition?: string };
  } | null;
};
export type Maintenance = {
  id: string;
  reference: string;
  facilityId: string;
  facility: Facility;
  reason: string;
  notes: string;
  startAt: string;
  endAt: string;
  status: string;
  version: number;
  actualStartAt?: string;
  actualEndAt?: string;
};
export type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  resourceType?: string;
  resourceId?: string;
  readAt?: string | null;
  createdAt: string;
};
export type ApiList<T> = { data: T[]; meta: { total: number; page: number; limit: number } };
export type CalendarData = {
  timezone: string;
  claims: {
    id: string;
    facilityId: string;
    startAt: string;
    endAt: string;
    kind: string;
    status: string;
    reference?: string;
    responsible?: string;
  }[];
  pending: { facilityId: string; startAt: string; endAt: string }[];
  active: { facilityId: string; bookingId: string; startAt: string }[];
};
