-- AlterTable: extend employee_attendance_overrides with per-employee schedule fields.
-- All optional: NULL / empty array means "fall back to the assigned policy".
ALTER TABLE "employee_attendance_overrides"
  ADD COLUMN "schedule_start"      TEXT,
  ADD COLUMN "schedule_end"        TEXT,
  ADD COLUMN "working_days"        INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
  ADD COLUMN "grace_minutes_late"  INTEGER,
  ADD COLUMN "grace_minutes_early" INTEGER;
