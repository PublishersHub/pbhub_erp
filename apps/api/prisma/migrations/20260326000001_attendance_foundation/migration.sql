-- CreateEnum
CREATE TYPE "AttendancePolicyType" AS ENUM ('FIXED', 'FLEXIBLE');

-- CreateEnum
CREATE TYPE "AttendanceLogType" AS ENUM ('CHECK_IN', 'CHECK_OUT');

-- CreateEnum
CREATE TYPE "AttendanceLogSource" AS ENUM ('WEB', 'MOBILE', 'MANUAL', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'HALF_DAY', 'LATE', 'ON_LEAVE', 'HOLIDAY', 'WEEKEND');

-- CreateEnum
CREATE TYPE "CorrectionRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "attendance_policies" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "policy_type" "AttendancePolicyType" NOT NULL,
    "start_time" TEXT,
    "end_time" TEXT,
    "min_hours_per_day" DECIMAL(4,2),
    "core_start_time" TEXT,
    "core_end_time" TEXT,
    "grace_minutes_late" INTEGER NOT NULL DEFAULT 0,
    "grace_minutes_early" INTEGER NOT NULL DEFAULT 0,
    "half_day_threshold_minutes" INTEGER,
    "working_days" INTEGER[] NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_attendance_policy_assignments" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "attendance_policy_id" TEXT NOT NULL,
    "effective_from" DATE NOT NULL,
    "effective_to" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_attendance_policy_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "allowed_ip_rules" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "ip_address" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "allowed_ip_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_attendance_overrides" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "ip_restriction_exempt" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_attendance_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_logs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "log_type" "AttendanceLogType" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "ip_address" TEXT,
    "source" "AttendanceLogSource" NOT NULL DEFAULT 'WEB',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_daily_summaries" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'ABSENT',
    "first_check_in" TIMESTAMP(3),
    "last_check_out" TIMESTAMP(3),
    "total_worked_minutes" INTEGER NOT NULL DEFAULT 0,
    "overtime_minutes" INTEGER NOT NULL DEFAULT 0,
    "late_minutes" INTEGER NOT NULL DEFAULT 0,
    "early_departure_minutes" INTEGER NOT NULL DEFAULT 0,
    "is_ip_compliant" BOOLEAN,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_daily_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_correction_requests" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "original_check_in" TIMESTAMP(3),
    "original_check_out" TIMESTAMP(3),
    "requested_check_in" TIMESTAMP(3),
    "requested_check_out" TIMESTAMP(3),
    "reason" TEXT NOT NULL,
    "status" "CorrectionRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "reviewer_remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_correction_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: attendance_policies
CREATE UNIQUE INDEX "attendance_policies_organization_id_name_key" ON "attendance_policies"("organization_id", "name");
CREATE INDEX "attendance_policies_organization_id_idx" ON "attendance_policies"("organization_id");

-- CreateIndex: employee_attendance_policy_assignments
CREATE INDEX "employee_attendance_policy_assignments_employee_id_idx" ON "employee_attendance_policy_assignments"("employee_id");
CREATE INDEX "employee_attendance_policy_assignments_policy_id_idx" ON "employee_attendance_policy_assignments"("attendance_policy_id");

-- CreateIndex: allowed_ip_rules
CREATE INDEX "allowed_ip_rules_organization_id_idx" ON "allowed_ip_rules"("organization_id");

-- CreateIndex: employee_attendance_overrides
CREATE UNIQUE INDEX "employee_attendance_overrides_employee_id_key" ON "employee_attendance_overrides"("employee_id");

-- CreateIndex: attendance_logs
CREATE INDEX "attendance_logs_organization_id_idx" ON "attendance_logs"("organization_id");
CREATE INDEX "attendance_logs_employee_id_idx" ON "attendance_logs"("employee_id");
CREATE INDEX "attendance_logs_employee_id_timestamp_idx" ON "attendance_logs"("employee_id", "timestamp");

-- CreateIndex: attendance_daily_summaries
CREATE UNIQUE INDEX "attendance_daily_summaries_employee_id_date_key" ON "attendance_daily_summaries"("employee_id", "date");
CREATE INDEX "attendance_daily_summaries_organization_id_idx" ON "attendance_daily_summaries"("organization_id");
CREATE INDEX "attendance_daily_summaries_organization_id_date_idx" ON "attendance_daily_summaries"("organization_id", "date");

-- CreateIndex: attendance_correction_requests
CREATE INDEX "attendance_correction_requests_organization_id_idx" ON "attendance_correction_requests"("organization_id");
CREATE INDEX "attendance_correction_requests_employee_id_idx" ON "attendance_correction_requests"("employee_id");
CREATE INDEX "attendance_correction_requests_status_idx" ON "attendance_correction_requests"("status");

-- AddForeignKey
ALTER TABLE "attendance_policies" ADD CONSTRAINT "attendance_policies_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_attendance_policy_assignments" ADD CONSTRAINT "employee_attendance_policy_assignments_employee_id_fkey"
    FOREIGN KEY ("employee_id") REFERENCES "employees"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_attendance_policy_assignments" ADD CONSTRAINT "employee_attendance_policy_assignments_policy_id_fkey"
    FOREIGN KEY ("attendance_policy_id") REFERENCES "attendance_policies"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allowed_ip_rules" ADD CONSTRAINT "allowed_ip_rules_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_attendance_overrides" ADD CONSTRAINT "employee_attendance_overrides_employee_id_fkey"
    FOREIGN KEY ("employee_id") REFERENCES "employees"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_logs" ADD CONSTRAINT "attendance_logs_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_logs" ADD CONSTRAINT "attendance_logs_employee_id_fkey"
    FOREIGN KEY ("employee_id") REFERENCES "employees"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_daily_summaries" ADD CONSTRAINT "attendance_daily_summaries_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_daily_summaries" ADD CONSTRAINT "attendance_daily_summaries_employee_id_fkey"
    FOREIGN KEY ("employee_id") REFERENCES "employees"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_correction_requests" ADD CONSTRAINT "attendance_correction_requests_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_correction_requests" ADD CONSTRAINT "attendance_correction_requests_employee_id_fkey"
    FOREIGN KEY ("employee_id") REFERENCES "employees"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_correction_requests" ADD CONSTRAINT "attendance_correction_requests_reviewed_by_id_fkey"
    FOREIGN KEY ("reviewed_by_id") REFERENCES "employees"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
