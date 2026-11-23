-- ORBS initial migration. Generated from multi-file Prisma models; reviewed custom constraints.
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE "Notification" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "recipientId" UUID NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "resourceType" TEXT,
  "resourceId" TEXT,
  "readAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "OutboxEvent" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "eventType" TEXT NOT NULL,
  "aggregateType" TEXT NOT NULL,
  "aggregateId" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "availableAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMPTZ,
  "lastError" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "AuditLog" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "actorId" UUID,
  "actorType" TEXT NOT NULL DEFAULT 'USER',
  "action" TEXT NOT NULL,
  "resourceType" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "before" JSONB,
  "after" JSONB,
  "reason" TEXT,
  "correlationId" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "IdempotencyRecord" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "actorId" UUID NOT NULL,
  "scope" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "fingerprint" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PROCESSING',
  "responseStatus" INTEGER,
  "response" JSONB,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMPTZ
);

CREATE TABLE "FacilityCategory" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE "Facility" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "categoryId" UUID NOT NULL,
  "locationId" UUID NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "approvalPolicy" TEXT NOT NULL DEFAULT 'REQUIRE_APPROVAL',
  "minMinutes" INTEGER NOT NULL DEFAULT 30,
  "maxMinutes" INTEGER NOT NULL DEFAULT 480,
  "leadMinutes" INTEGER NOT NULL DEFAULT 15,
  "bufferMinutes" INTEGER NOT NULL DEFAULT 0,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "FacilityOperatingWindow" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "facilityId" UUID NOT NULL,
  "dayOfWeek" INTEGER NOT NULL,
  "opens" TEXT NOT NULL,
  "closes" TEXT NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'BOOKING',
  "active" BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE "MeetingRoomProfile" (
  "facilityId" UUID NOT NULL PRIMARY KEY,
  "floor" TEXT NOT NULL DEFAULT '',
  "capacity" INTEGER NOT NULL,
  "amenities" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]
);

CREATE TABLE "VehicleProfile" (
  "facilityId" UUID NOT NULL PRIMARY KEY,
  "plateNumber" TEXT NOT NULL,
  "brand" TEXT NOT NULL DEFAULT '',
  "model" TEXT NOT NULL DEFAULT '',
  "vehicleType" TEXT NOT NULL DEFAULT 'CAR',
  "passengerCapacity" INTEGER NOT NULL DEFAULT 4,
  "currentOdometer" INTEGER NOT NULL DEFAULT 0,
  "currentCondition" TEXT NOT NULL DEFAULT 'GOOD'
);

CREATE TABLE "EquipmentProfile" (
  "facilityId" UUID NOT NULL PRIMARY KEY,
  "assetCode" TEXT NOT NULL,
  "brand" TEXT NOT NULL DEFAULT '',
  "model" TEXT NOT NULL DEFAULT '',
  "serialNumber" TEXT,
  "currentCondition" TEXT NOT NULL DEFAULT 'GOOD'
);

CREATE TABLE "UsageSession" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "bookingId" UUID NOT NULL,
  "facilityId" UUID NOT NULL,
  "actualUserId" UUID NOT NULL,
  "startedById" UUID NOT NULL,
  "endedById" UUID,
  "startAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endAt" TIMESTAMPTZ,
  "state" TEXT NOT NULL DEFAULT 'ACTIVE',
  "startNotes" TEXT NOT NULL DEFAULT '',
  "endNotes" TEXT NOT NULL DEFAULT '',
  "version" INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE "VehicleUsageDetail" (
  "usageId" UUID NOT NULL PRIMARY KEY,
  "actualDriverId" UUID NOT NULL,
  "handoverOfficerId" UUID NOT NULL,
  "startOdometer" INTEGER NOT NULL,
  "endOdometer" INTEGER,
  "startCondition" TEXT NOT NULL,
  "endCondition" TEXT,
  "fuelStart" TEXT,
  "fuelEnd" TEXT,
  "returnOfficerId" UUID,
  "damageNotes" TEXT,
  "distance" INTEGER
);

CREATE TABLE "EquipmentUsageDetail" (
  "usageId" UUID NOT NULL PRIMARY KEY,
  "handoverOfficerId" UUID NOT NULL,
  "startCondition" TEXT NOT NULL,
  "endCondition" TEXT,
  "returnOfficerId" UUID,
  "damageNotes" TEXT
);

CREATE TABLE "Maintenance" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "reference" TEXT NOT NULL,
  "facilityId" UUID NOT NULL,
  "reason" TEXT NOT NULL,
  "notes" TEXT NOT NULL DEFAULT '',
  "startAt" TIMESTAMPTZ NOT NULL,
  "endAt" TIMESTAMPTZ NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
  "createdById" UUID NOT NULL,
  "startedById" UUID,
  "completedById" UUID,
  "cancelledById" UUID,
  "cancellationReason" TEXT,
  "actualStartAt" TIMESTAMPTZ,
  "actualEndAt" TIMESTAMPTZ,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "User" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "employeeCode" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "departmentId" UUID,
  "role" TEXT NOT NULL DEFAULT 'EMPLOYEE',
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "mustChangePassword" BOOLEAN NOT NULL DEFAULT FALSE,
  "version" INTEGER NOT NULL DEFAULT 1,
  "deactivatedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "AuthSession" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "userId" UUID NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "csrfHash" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "revokedAt" TIMESTAMPTZ,
  "device" TEXT NOT NULL DEFAULT ''
);

CREATE TABLE "Booking" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "reference" TEXT NOT NULL,
  "facilityId" UUID NOT NULL,
  "requesterId" UUID NOT NULL,
  "responsibleUserId" UUID NOT NULL,
  "createdById" UUID NOT NULL,
  "purpose" TEXT NOT NULL,
  "startAt" TIMESTAMPTZ NOT NULL,
  "endAt" TIMESTAMPTZ NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "confirmationSource" TEXT,
  "confirmedAt" TIMESTAMPTZ,
  "cancellationReason" TEXT,
  "cancelledById" UUID,
  "cancelledAt" TIMESTAMPTZ,
  "noShowReason" TEXT,
  "noShowById" UUID,
  "noShowAt" TIMESTAMPTZ,
  "expiredAt" TIMESTAMPTZ,
  "policySnapshot" JSONB NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "MeetingBookingDetail" (
  "bookingId" UUID NOT NULL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "attendees" INTEGER NOT NULL
);

CREATE TABLE "VehicleBookingDetail" (
  "bookingId" UUID NOT NULL PRIMARY KEY,
  "destination" TEXT NOT NULL,
  "travelPurpose" TEXT NOT NULL,
  "designatedDriverId" UUID NOT NULL
);

CREATE TABLE "BookingApproval" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "bookingId" UUID NOT NULL,
  "approverId" UUID NOT NULL,
  "decision" TEXT NOT NULL,
  "reason" TEXT,
  "adminException" BOOLEAN NOT NULL DEFAULT FALSE,
  "exceptionReason" TEXT,
  "decidedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "ResourceTimeClaim" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "facilityId" UUID NOT NULL,
  "bookingId" UUID,
  "maintenanceId" UUID,
  "startAt" TIMESTAMPTZ NOT NULL,
  "endAt" TIMESTAMPTZ NOT NULL,
  "state" TEXT NOT NULL DEFAULT 'ACTIVE',
  "bufferMinutes" INTEGER NOT NULL DEFAULT 0,
  "releasedAt" TIMESTAMPTZ,
  "releaseReason" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "OrganizationSetting" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "name" TEXT NOT NULL DEFAULT 'Northstar Office',
  "timezone" TEXT NOT NULL DEFAULT 'Asia/Makassar',
  "bookingIntervalMinutes" INTEGER NOT NULL DEFAULT 15,
  "leadMinutes" INTEGER NOT NULL DEFAULT 15,
  "horizonDays" INTEGER NOT NULL DEFAULT 90,
  "noShowMinutes" INTEGER NOT NULL DEFAULT 30,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Department" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE "OfficeLocation" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "address" TEXT NOT NULL DEFAULT '',
  "active" BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE UNIQUE INDEX "FacilityCategory_code_uniq" ON "FacilityCategory" ("code");
CREATE UNIQUE INDEX "Facility_code_uniq" ON "Facility" ("code");
CREATE UNIQUE INDEX "VehicleProfile_plateNumber_uniq" ON "VehicleProfile" ("plateNumber");
CREATE UNIQUE INDEX "EquipmentProfile_assetCode_uniq" ON "EquipmentProfile" ("assetCode");
CREATE UNIQUE INDEX "EquipmentProfile_serialNumber_uniq" ON "EquipmentProfile" ("serialNumber");
CREATE UNIQUE INDEX "UsageSession_bookingId_uniq" ON "UsageSession" ("bookingId");
CREATE UNIQUE INDEX "Maintenance_reference_uniq" ON "Maintenance" ("reference");
CREATE UNIQUE INDEX "User_employeeCode_uniq" ON "User" ("employeeCode");
CREATE UNIQUE INDEX "User_email_uniq" ON "User" ("email");
CREATE UNIQUE INDEX "AuthSession_tokenHash_uniq" ON "AuthSession" ("tokenHash");
CREATE UNIQUE INDEX "Booking_reference_uniq" ON "Booking" ("reference");
CREATE UNIQUE INDEX "BookingApproval_bookingId_uniq" ON "BookingApproval" ("bookingId");
CREATE UNIQUE INDEX "ResourceTimeClaim_bookingId_uniq" ON "ResourceTimeClaim" ("bookingId");
CREATE UNIQUE INDEX "ResourceTimeClaim_maintenanceId_uniq" ON "ResourceTimeClaim" ("maintenanceId");
CREATE UNIQUE INDEX "Department_code_uniq" ON "Department" ("code");
CREATE UNIQUE INDEX "OfficeLocation_code_uniq" ON "OfficeLocation" ("code");
CREATE INDEX "Notification_recipientId_createdAt_idx" ON "Notification" ("recipientId", "createdAt");
CREATE INDEX "OutboxEvent_status_availableAt_idx" ON "OutboxEvent" ("status", "availableAt");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog" ("createdAt");
CREATE INDEX "AuditLog_resourceType_resourceId_createdAt_idx" ON "AuditLog" ("resourceType", "resourceId", "createdAt");
CREATE UNIQUE INDEX "IdempotencyRecord_actorId_scope_key_uniq" ON "IdempotencyRecord" ("actorId", "scope", "key");
CREATE INDEX "IdempotencyRecord_expiresAt_idx" ON "IdempotencyRecord" ("expiresAt");
CREATE INDEX "Facility_categoryId_locationId_status_idx" ON "Facility" ("categoryId", "locationId", "status");
CREATE INDEX "FacilityOperatingWindow_facilityId_dayOfWeek_idx" ON "FacilityOperatingWindow" ("facilityId", "dayOfWeek");
CREATE INDEX "UsageSession_facilityId_state_idx" ON "UsageSession" ("facilityId", "state");
CREATE INDEX "Maintenance_facilityId_startAt_idx" ON "Maintenance" ("facilityId", "startAt");
CREATE INDEX "Maintenance_status_startAt_idx" ON "Maintenance" ("status", "startAt");
CREATE INDEX "AuthSession_userId_revokedAt_idx" ON "AuthSession" ("userId", "revokedAt");
CREATE INDEX "Booking_responsibleUserId_startAt_idx" ON "Booking" ("responsibleUserId", "startAt");
CREATE INDEX "Booking_status_startAt_idx" ON "Booking" ("status", "startAt");
CREATE INDEX "Booking_facilityId_startAt_idx" ON "Booking" ("facilityId", "startAt");
CREATE INDEX "ResourceTimeClaim_facilityId_state_idx" ON "ResourceTimeClaim" ("facilityId", "state");
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientId_fk" FOREIGN KEY ("recipientId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IdempotencyRecord" ADD CONSTRAINT "IdempotencyRecord_actorId_fk" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Facility" ADD CONSTRAINT "Facility_categoryId_fk" FOREIGN KEY ("categoryId") REFERENCES "FacilityCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Facility" ADD CONSTRAINT "Facility_locationId_fk" FOREIGN KEY ("locationId") REFERENCES "OfficeLocation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FacilityOperatingWindow" ADD CONSTRAINT "FacilityOperatingWindow_facilityId_fk" FOREIGN KEY ("facilityId") REFERENCES "Facility" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MeetingRoomProfile" ADD CONSTRAINT "MeetingRoomProfile_facilityId_fk" FOREIGN KEY ("facilityId") REFERENCES "Facility" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleProfile" ADD CONSTRAINT "VehicleProfile_facilityId_fk" FOREIGN KEY ("facilityId") REFERENCES "Facility" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EquipmentProfile" ADD CONSTRAINT "EquipmentProfile_facilityId_fk" FOREIGN KEY ("facilityId") REFERENCES "Facility" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UsageSession" ADD CONSTRAINT "UsageSession_bookingId_fk" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UsageSession" ADD CONSTRAINT "UsageSession_facilityId_fk" FOREIGN KEY ("facilityId") REFERENCES "Facility" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleUsageDetail" ADD CONSTRAINT "VehicleUsageDetail_usageId_fk" FOREIGN KEY ("usageId") REFERENCES "UsageSession" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EquipmentUsageDetail" ADD CONSTRAINT "EquipmentUsageDetail_usageId_fk" FOREIGN KEY ("usageId") REFERENCES "UsageSession" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Maintenance" ADD CONSTRAINT "Maintenance_facilityId_fk" FOREIGN KEY ("facilityId") REFERENCES "Facility" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "User" ADD CONSTRAINT "User_departmentId_fk" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userId_fk" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_facilityId_fk" FOREIGN KEY ("facilityId") REFERENCES "Facility" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MeetingBookingDetail" ADD CONSTRAINT "MeetingBookingDetail_bookingId_fk" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleBookingDetail" ADD CONSTRAINT "VehicleBookingDetail_bookingId_fk" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BookingApproval" ADD CONSTRAINT "BookingApproval_bookingId_fk" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ResourceTimeClaim" ADD CONSTRAINT "ResourceTimeClaim_facilityId_fk" FOREIGN KEY ("facilityId") REFERENCES "Facility" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ResourceTimeClaim" ADD CONSTRAINT "ResourceTimeClaim_bookingId_fk" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ResourceTimeClaim" ADD CONSTRAINT "ResourceTimeClaim_maintenanceId_fk" FOREIGN KEY ("maintenanceId") REFERENCES "Maintenance" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Scheduling, custody, and scalar domain safeguards.
ALTER TABLE "ResourceTimeClaim"
  ADD CONSTRAINT "claim_exactly_one_source" CHECK (("bookingId" IS NULL) <> ("maintenanceId" IS NULL)),
  ADD CONSTRAINT "claim_time_positive" CHECK ("endAt" > "startAt"),
  ADD CONSTRAINT "claim_state_check" CHECK ("state" IN ('ACTIVE','RELEASED')),
  ADD CONSTRAINT "claim_buffer_valid" CHECK ("bufferMinutes" >= 0);
ALTER TABLE "ResourceTimeClaim" ADD CONSTRAINT "claim_no_overlaps"
  EXCLUDE USING gist ("facilityId" WITH =, tstzrange("startAt", "endAt", '[)') WITH &&)
  WHERE ("state" = 'ACTIVE');
CREATE UNIQUE INDEX "one_active_usage_per_facility" ON "UsageSession" ("facilityId")
  WHERE ("state" = 'ACTIVE' AND "endAt" IS NULL);
ALTER TABLE "Booking" ADD CONSTRAINT "booking_time_positive" CHECK ("endAt" > "startAt"),
  ADD CONSTRAINT "booking_status_valid" CHECK ("status" IN ('PENDING','CONFIRMED','REJECTED','CANCELLED','IN_USE','COMPLETED','NO_SHOW','EXPIRED'));
ALTER TABLE "Maintenance" ADD CONSTRAINT "maintenance_time_positive" CHECK ("endAt" > "startAt"),
  ADD CONSTRAINT "maintenance_status_valid" CHECK ("status" IN ('SCHEDULED','IN_PROGRESS','COMPLETED','CANCELLED'));
ALTER TABLE "UsageSession" ADD CONSTRAINT "usage_time_positive" CHECK ("endAt" IS NULL OR "endAt" >= "startAt"),
  ADD CONSTRAINT "usage_state_valid" CHECK ("state" IN ('ACTIVE','COMPLETED'));
ALTER TABLE "VehicleUsageDetail" ADD CONSTRAINT "vehicle_odometer_positive"
  CHECK ("startOdometer" >= 0 AND ("endOdometer" IS NULL OR "endOdometer" >= "startOdometer"));
ALTER TABLE "VehicleProfile" ADD CONSTRAINT "vehicle_profile_positive"
  CHECK ("currentOdometer" >= 0 AND "passengerCapacity" > 0);
ALTER TABLE "MeetingRoomProfile" ADD CONSTRAINT "meeting_capacity_positive" CHECK ("capacity" > 0);
ALTER TABLE "Facility" ADD CONSTRAINT "facility_duration_valid"
  CHECK ("minMinutes" > 0 AND "maxMinutes" >= "minMinutes" AND "bufferMinutes" >= 0 AND "leadMinutes" >= 0);
ALTER TABLE "Facility" ADD CONSTRAINT "facility_status_valid" CHECK ("status" IN ('ACTIVE','INACTIVE','ARCHIVED')),
 ADD CONSTRAINT "facility_policy_valid" CHECK ("approvalPolicy" IN ('AUTO_CONFIRM','REQUIRE_APPROVAL'));
ALTER TABLE "User" ADD CONSTRAINT "user_role_valid" CHECK ("role" IN ('EMPLOYEE','FACILITY_MANAGER','ADMIN')),
  ADD CONSTRAINT "user_status_valid" CHECK ("status" IN ('ACTIVE','INACTIVE'));
ALTER TABLE "BookingApproval" ADD CONSTRAINT "approval_reason_valid"
 CHECK (("decision" = 'APPROVED' OR ("decision" = 'REJECTED' AND length(trim(coalesce("reason",''))) > 0)) AND (NOT "adminException" OR length(trim(coalesce("exceptionReason",''))) > 0));
CREATE UNIQUE INDEX "user_email_ci" ON "User" (lower("email"));
CREATE UNIQUE INDEX "vehicle_plate_ci" ON "VehicleProfile" (upper("plateNumber"));
CREATE UNIQUE INDEX "equipment_asset_ci" ON "EquipmentProfile" (upper("assetCode"));

-- Operating-window scalar integrity. Cross-row overlap is validated by the
-- administrative transaction before replacing a facility's complete window set.
ALTER TABLE "FacilityOperatingWindow"
  ADD CONSTRAINT "window_valid_day" CHECK ("dayOfWeek" BETWEEN 0 AND 6),
  ADD CONSTRAINT "window_valid_kind" CHECK ("kind" IN ('BOOKING','HANDOVER','RETURN')),
  ADD CONSTRAINT "window_valid_clock" CHECK (
    "opens" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
    AND "closes" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
    AND "opens" < "closes"
  );
