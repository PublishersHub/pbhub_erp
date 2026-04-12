-- CreateEnum
CREATE TYPE "PerformanceCycleStatus" AS ENUM ('DRAFT', 'GOAL_SETTING', 'ACTIVE', 'SELF_REVIEW', 'MANAGER_REVIEW', 'CALIBRATION', 'CLOSED');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "GoalMeasurementType" AS ENUM ('PERCENTAGE', 'NUMERIC', 'QUALITATIVE');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('NOT_STARTED', 'SELF_REVIEW_IN_PROGRESS', 'SELF_REVIEW_SUBMITTED', 'MANAGER_REVIEW_IN_PROGRESS', 'MANAGER_REVIEW_SUBMITTED', 'COMPLETED');

-- CreateTable
CREATE TABLE "performance_cycles" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "quarter" INTEGER NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "goal_setting_deadline" DATE,
    "self_review_deadline" DATE,
    "manager_review_deadline" DATE,
    "status" "PerformanceCycleStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "performance_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goals" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "cycle_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "created_by_employee_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "measurement_type" "GoalMeasurementType" NOT NULL,
    "target_value" DECIMAL(10,2),
    "current_value" DECIMAL(10,2) DEFAULT 0,
    "weight" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "status" "GoalStatus" NOT NULL DEFAULT 'DRAFT',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "approved_by_employee_id" TEXT,
    "approved_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal_progress_updates" (
    "id" TEXT NOT NULL,
    "goal_id" TEXT NOT NULL,
    "updated_by_employee_id" TEXT NOT NULL,
    "value" DECIMAL(10,2),
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goal_progress_updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance_reviews" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "cycle_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "reviewer_employee_id" TEXT,
    "status" "ReviewStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "self_comment" TEXT,
    "self_rating" DECIMAL(3,2),
    "self_submitted_at" TIMESTAMP(3),
    "manager_comment" TEXT,
    "manager_rating" DECIMAL(3,2),
    "manager_submitted_at" TIMESTAMP(3),
    "final_rating" DECIMAL(3,2),
    "calibration_comment" TEXT,
    "calibrated_by_employee_id" TEXT,
    "calibrated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "performance_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal_reviews" (
    "id" TEXT NOT NULL,
    "review_id" TEXT NOT NULL,
    "goal_id" TEXT NOT NULL,
    "self_rating" DECIMAL(3,2),
    "self_comment" TEXT,
    "manager_rating" DECIMAL(3,2),
    "manager_comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goal_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "performance_cycles_organization_id_idx" ON "performance_cycles"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "performance_cycles_organization_id_year_quarter_key" ON "performance_cycles"("organization_id", "year", "quarter");

-- CreateIndex
CREATE INDEX "goals_organization_id_idx" ON "goals"("organization_id");

-- CreateIndex
CREATE INDEX "goals_cycle_id_idx" ON "goals"("cycle_id");

-- CreateIndex
CREATE INDEX "goals_employee_id_idx" ON "goals"("employee_id");

-- CreateIndex
CREATE INDEX "goals_created_by_employee_id_idx" ON "goals"("created_by_employee_id");

-- CreateIndex
CREATE INDEX "goal_progress_updates_goal_id_idx" ON "goal_progress_updates"("goal_id");

-- CreateIndex
CREATE INDEX "performance_reviews_organization_id_idx" ON "performance_reviews"("organization_id");

-- CreateIndex
CREATE INDEX "performance_reviews_cycle_id_idx" ON "performance_reviews"("cycle_id");

-- CreateIndex
CREATE INDEX "performance_reviews_employee_id_idx" ON "performance_reviews"("employee_id");

-- CreateIndex
CREATE INDEX "performance_reviews_reviewer_employee_id_idx" ON "performance_reviews"("reviewer_employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "performance_reviews_cycle_id_employee_id_key" ON "performance_reviews"("cycle_id", "employee_id");

-- CreateIndex
CREATE INDEX "goal_reviews_review_id_idx" ON "goal_reviews"("review_id");

-- CreateIndex
CREATE INDEX "goal_reviews_goal_id_idx" ON "goal_reviews"("goal_id");

-- CreateIndex
CREATE UNIQUE INDEX "goal_reviews_review_id_goal_id_key" ON "goal_reviews"("review_id", "goal_id");

-- AddForeignKey
ALTER TABLE "performance_cycles" ADD CONSTRAINT "performance_cycles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "performance_cycles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_created_by_employee_id_fkey" FOREIGN KEY ("created_by_employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_approved_by_employee_id_fkey" FOREIGN KEY ("approved_by_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_progress_updates" ADD CONSTRAINT "goal_progress_updates_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_progress_updates" ADD CONSTRAINT "goal_progress_updates_updated_by_employee_id_fkey" FOREIGN KEY ("updated_by_employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "performance_cycles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_reviewer_employee_id_fkey" FOREIGN KEY ("reviewer_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_calibrated_by_employee_id_fkey" FOREIGN KEY ("calibrated_by_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_reviews" ADD CONSTRAINT "goal_reviews_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "performance_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_reviews" ADD CONSTRAINT "goal_reviews_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "goals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
