-- CreateEnum
CREATE TYPE "LeaveRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ApproverRole" AS ENUM ('MANAGER', 'HR');

-- CreateEnum
CREATE TYPE "ApprovalAction" AS ENUM ('APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "LeaveDayType" AS ENUM ('FULL_DAY', 'FIRST_HALF', 'SECOND_HALF');

-- CreateTable
CREATE TABLE "leave_policies" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "annual_quota_default" DECIMAL(5,2) NOT NULL,
    "carry_forward_limit" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "max_consecutive_days" INTEGER,
    "allow_half_day" BOOLEAN NOT NULL DEFAULT true,
    "requires_approval" BOOLEAN NOT NULL DEFAULT true,
    "is_paid" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_leave_policy_assignments" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "leave_policy_id" TEXT NOT NULL,
    "custom_annual_quota" DECIMAL(5,2),
    "effective_from" DATE NOT NULL,
    "effective_to" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_leave_policy_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_leave_balances" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "leave_policy_id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "total_entitled" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "used" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "carried_forward" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "adjustments" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "balance" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_leave_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_requests" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "leave_policy_id" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "total_days" DECIMAL(5,2) NOT NULL,
    "is_half_day" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT,
    "status" "LeaveRequestStatus" NOT NULL DEFAULT 'PENDING',
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "manager_decision_at" TIMESTAMP(3),
    "hr_decision_at" TIMESTAMP(3),
    "final_decision_at" TIMESTAMP(3),
    "final_decision_by_id" TEXT,
    "cancelled_at" TIMESTAMP(3),
    "cancel_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_request_days" (
    "id" TEXT NOT NULL,
    "leave_request_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "day_type" "LeaveDayType" NOT NULL DEFAULT 'FULL_DAY',
    "days" DECIMAL(4,2) NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leave_request_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_approval_actions" (
    "id" TEXT NOT NULL,
    "leave_request_id" TEXT NOT NULL,
    "approver_employee_id" TEXT NOT NULL,
    "approver_role" "ApproverRole" NOT NULL,
    "action" "ApprovalAction" NOT NULL,
    "remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leave_approval_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "holidays" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "is_optional" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "holidays_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "leave_policies_organization_id_idx" ON "leave_policies"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "leave_policies_organization_id_code_key" ON "leave_policies"("organization_id", "code");

-- CreateIndex
CREATE INDEX "employee_leave_policy_assignments_organization_id_idx" ON "employee_leave_policy_assignments"("organization_id");

-- CreateIndex
CREATE INDEX "employee_leave_policy_assignments_employee_id_idx" ON "employee_leave_policy_assignments"("employee_id");

-- CreateIndex
CREATE INDEX "employee_leave_policy_assignments_leave_policy_id_idx" ON "employee_leave_policy_assignments"("leave_policy_id");

-- CreateIndex
CREATE UNIQUE INDEX "employee_leave_policy_assignments_employee_id_leave_policy__key" ON "employee_leave_policy_assignments"("employee_id", "leave_policy_id", "effective_from");

-- CreateIndex
CREATE INDEX "employee_leave_balances_organization_id_idx" ON "employee_leave_balances"("organization_id");

-- CreateIndex
CREATE INDEX "employee_leave_balances_employee_id_idx" ON "employee_leave_balances"("employee_id");

-- CreateIndex
CREATE INDEX "employee_leave_balances_leave_policy_id_idx" ON "employee_leave_balances"("leave_policy_id");

-- CreateIndex
CREATE UNIQUE INDEX "employee_leave_balances_employee_id_leave_policy_id_year_key" ON "employee_leave_balances"("employee_id", "leave_policy_id", "year");

-- CreateIndex
CREATE INDEX "leave_requests_organization_id_idx" ON "leave_requests"("organization_id");

-- CreateIndex
CREATE INDEX "leave_requests_employee_id_idx" ON "leave_requests"("employee_id");

-- CreateIndex
CREATE INDEX "leave_requests_leave_policy_id_idx" ON "leave_requests"("leave_policy_id");

-- CreateIndex
CREATE INDEX "leave_requests_status_idx" ON "leave_requests"("status");

-- CreateIndex
CREATE INDEX "leave_requests_employee_id_start_date_end_date_idx" ON "leave_requests"("employee_id", "start_date", "end_date");

-- CreateIndex
CREATE UNIQUE INDEX "leave_request_days_leave_request_id_date_key" ON "leave_request_days"("leave_request_id", "date");

-- CreateIndex
CREATE INDEX "leave_approval_actions_leave_request_id_idx" ON "leave_approval_actions"("leave_request_id");

-- CreateIndex
CREATE INDEX "leave_approval_actions_approver_employee_id_idx" ON "leave_approval_actions"("approver_employee_id");

-- CreateIndex
CREATE INDEX "holidays_organization_id_idx" ON "holidays"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "holidays_organization_id_date_key" ON "holidays"("organization_id", "date");

-- RenameForeignKey
ALTER TABLE "employee_attendance_policy_assignments" RENAME CONSTRAINT "employee_attendance_policy_assignments_policy_id_fkey" TO "employee_attendance_policy_assignments_attendance_policy_i_fkey";

-- AddForeignKey
ALTER TABLE "leave_policies" ADD CONSTRAINT "leave_policies_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_leave_policy_assignments" ADD CONSTRAINT "employee_leave_policy_assignments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_leave_policy_assignments" ADD CONSTRAINT "employee_leave_policy_assignments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_leave_policy_assignments" ADD CONSTRAINT "employee_leave_policy_assignments_leave_policy_id_fkey" FOREIGN KEY ("leave_policy_id") REFERENCES "leave_policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_leave_balances" ADD CONSTRAINT "employee_leave_balances_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_leave_balances" ADD CONSTRAINT "employee_leave_balances_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_leave_balances" ADD CONSTRAINT "employee_leave_balances_leave_policy_id_fkey" FOREIGN KEY ("leave_policy_id") REFERENCES "leave_policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_leave_policy_id_fkey" FOREIGN KEY ("leave_policy_id") REFERENCES "leave_policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_final_decision_by_id_fkey" FOREIGN KEY ("final_decision_by_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_request_days" ADD CONSTRAINT "leave_request_days_leave_request_id_fkey" FOREIGN KEY ("leave_request_id") REFERENCES "leave_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_approval_actions" ADD CONSTRAINT "leave_approval_actions_leave_request_id_fkey" FOREIGN KEY ("leave_request_id") REFERENCES "leave_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_approval_actions" ADD CONSTRAINT "leave_approval_actions_approver_employee_id_fkey" FOREIGN KEY ("approver_employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "holidays" ADD CONSTRAINT "holidays_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "employee_attendance_policy_assignments_policy_id_idx" RENAME TO "employee_attendance_policy_assignments_attendance_policy_id_idx";
