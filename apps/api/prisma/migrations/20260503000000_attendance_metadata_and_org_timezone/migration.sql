-- AlterTable: add timezone to organizations
ALTER TABLE "organizations" ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'UTC';

-- AlterTable: add device + location metadata to attendance_logs
ALTER TABLE "attendance_logs"
  ADD COLUMN "user_agent" TEXT,
  ADD COLUMN "device_type" TEXT,
  ADD COLUMN "latitude" DECIMAL(10, 7),
  ADD COLUMN "longitude" DECIMAL(10, 7),
  ADD COLUMN "accuracy_meters" DECIMAL(10, 2),
  ADD COLUMN "location_label" TEXT;
