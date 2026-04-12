-- CreateEnum
CREATE TYPE "JobRequisitionStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'OPEN', 'ON_HOLD', 'FILLED', 'CANCELLED', 'CLOSED');

-- CreateEnum
CREATE TYPE "JobPostingStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED');

-- CreateEnum
CREATE TYPE "JobPostingChannel" AS ENUM ('INTERNAL', 'CAREERS_PAGE', 'LINKEDIN', 'INDEED', 'REFERRAL', 'OTHER');

-- CreateEnum
CREATE TYPE "CandidateSource" AS ENUM ('CAREERS_PAGE', 'LINKEDIN', 'INDEED', 'REFERRAL', 'AGENCY', 'DIRECT_OUTREACH', 'WALK_IN', 'OTHER');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('APPLIED', 'IN_PROGRESS', 'OFFER_EXTENDED', 'HIRED', 'REJECTED', 'WITHDRAWN', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "ApplicationRejectionReason" AS ENUM ('NOT_QUALIFIED', 'FAILED_INTERVIEW', 'FAILED_ASSESSMENT', 'CULTURAL_FIT', 'COMPENSATION_MISMATCH', 'POSITION_FILLED', 'DUPLICATE', 'OTHER');

-- CreateEnum
CREATE TYPE "InterviewType" AS ENUM ('PHONE_SCREEN', 'TECHNICAL', 'BEHAVIORAL', 'PANEL', 'SYSTEM_DESIGN', 'HIRING_MANAGER', 'HR_ROUND', 'FINAL', 'OTHER');

-- CreateEnum
CREATE TYPE "InterviewMode" AS ENUM ('IN_PERSON', 'VIDEO', 'PHONE');

-- CreateEnum
CREATE TYPE "InterviewStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED');

-- CreateEnum
CREATE TYPE "InterviewRecommendation" AS ENUM ('STRONG_HIRE', 'HIRE', 'NO_HIRE', 'STRONG_NO_HIRE', 'NEEDS_ANOTHER_ROUND');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('DRAFT', 'EXTENDED', 'ACCEPTED', 'DECLINED', 'RESCINDED', 'EXPIRED');

-- CreateTable
CREATE TABLE "job_requisitions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "requisition_number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "department_id" TEXT,
    "designation_id" TEXT,
    "hiring_manager_id" TEXT NOT NULL,
    "employment_type" "EmploymentType" NOT NULL,
    "number_of_openings" INTEGER NOT NULL DEFAULT 1,
    "positions_filled" INTEGER NOT NULL DEFAULT 0,
    "location" TEXT,
    "min_salary" DECIMAL(12,2),
    "max_salary" DECIMAL(12,2),
    "description" TEXT,
    "requirements" TEXT,
    "target_start_date" DATE,
    "status" "JobRequisitionStatus" NOT NULL DEFAULT 'DRAFT',
    "created_by_employee_id" TEXT NOT NULL,
    "submitted_at" TIMESTAMP(3),
    "approved_by_employee_id" TEXT,
    "approved_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_requisitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_postings" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "job_requisition_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "channel" "JobPostingChannel" NOT NULL,
    "description" TEXT NOT NULL,
    "is_internal" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "status" "JobPostingStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_postings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_stages" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "job_posting_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "is_terminal" BOOLEAN NOT NULL DEFAULT false,
    "is_hired" BOOLEAN NOT NULL DEFAULT false,
    "is_rejected" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "application_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidates" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "current_company" TEXT,
    "current_title" TEXT,
    "total_experience" DECIMAL(4,1),
    "linkedin_url" TEXT,
    "portfolio_url" TEXT,
    "resume_url" TEXT,
    "resume_file_name" TEXT,
    "location" TEXT,
    "notice_period_days" INTEGER,
    "source" "CandidateSource" NOT NULL DEFAULT 'OTHER',
    "referrer_employee_id" TEXT,
    "notes" TEXT,
    "is_blacklisted" BOOLEAN NOT NULL DEFAULT false,
    "blacklist_reason" TEXT,
    "converted_employee_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_applications" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "job_requisition_id" TEXT NOT NULL,
    "job_posting_id" TEXT,
    "current_stage_id" TEXT,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'APPLIED',
    "source" "CandidateSource" NOT NULL DEFAULT 'OTHER',
    "referrer_employee_id" TEXT,
    "applied_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cover_letter" TEXT,
    "resume_url" TEXT,
    "resume_file_name" TEXT,
    "expected_salary" DECIMAL(12,2),
    "rejection_reason" "ApplicationRejectionReason",
    "rejection_notes" TEXT,
    "rejected_at" TIMESTAMP(3),
    "rejected_by_employee_id" TEXT,
    "withdrawn_at" TIMESTAMP(3),
    "withdrawn_reason" TEXT,
    "hired_at" TIMESTAMP(3),
    "hired_employee_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_stage_history" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "from_stage_id" TEXT,
    "to_stage_id" TEXT NOT NULL,
    "moved_by_employee_id" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_stage_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interviews" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "stage_id" TEXT,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "duration_minutes" INTEGER NOT NULL DEFAULT 60,
    "type" "InterviewType" NOT NULL,
    "mode" "InterviewMode" NOT NULL DEFAULT 'VIDEO',
    "location" TEXT,
    "meeting_url" TEXT,
    "status" "InterviewStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduled_by_employee_id" TEXT NOT NULL,
    "cancelled_at" TIMESTAMP(3),
    "cancel_reason" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_panelists" (
    "id" TEXT NOT NULL,
    "interview_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interview_panelists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_feedback" (
    "id" TEXT NOT NULL,
    "interview_id" TEXT NOT NULL,
    "panelist_employee_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "recommendation" "InterviewRecommendation" NOT NULL,
    "strengths" TEXT,
    "weaknesses" TEXT,
    "comments" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interview_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offers" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "offer_number" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "employment_type" "EmploymentType" NOT NULL,
    "designation_id" TEXT,
    "department_id" TEXT,
    "reporting_manager_id" TEXT,
    "base_salary" DECIMAL(12,2) NOT NULL,
    "joining_bonus" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "proposed_joining_date" DATE NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "offer_letter_url" TEXT,
    "offer_letter_file_name" TEXT,
    "status" "OfferStatus" NOT NULL DEFAULT 'DRAFT',
    "extended_at" TIMESTAMP(3),
    "extended_by_employee_id" TEXT,
    "responded_at" TIMESTAMP(3),
    "rescinded_at" TIMESTAMP(3),
    "rescinded_by_employee_id" TEXT,
    "rescind_reason" TEXT,
    "decline_reason" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "job_requisitions_organization_id_idx" ON "job_requisitions"("organization_id");

-- CreateIndex
CREATE INDEX "job_requisitions_department_id_idx" ON "job_requisitions"("department_id");

-- CreateIndex
CREATE INDEX "job_requisitions_hiring_manager_id_idx" ON "job_requisitions"("hiring_manager_id");

-- CreateIndex
CREATE INDEX "job_requisitions_status_idx" ON "job_requisitions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "job_requisitions_organization_id_requisition_number_key" ON "job_requisitions"("organization_id", "requisition_number");

-- CreateIndex
CREATE INDEX "job_postings_organization_id_idx" ON "job_postings"("organization_id");

-- CreateIndex
CREATE INDEX "job_postings_job_requisition_id_idx" ON "job_postings"("job_requisition_id");

-- CreateIndex
CREATE INDEX "job_postings_status_idx" ON "job_postings"("status");

-- CreateIndex
CREATE UNIQUE INDEX "job_postings_organization_id_slug_key" ON "job_postings"("organization_id", "slug");

-- CreateIndex
CREATE INDEX "application_stages_job_posting_id_idx" ON "application_stages"("job_posting_id");

-- CreateIndex
CREATE UNIQUE INDEX "application_stages_job_posting_id_slug_key" ON "application_stages"("job_posting_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "application_stages_job_posting_id_sort_order_key" ON "application_stages"("job_posting_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "candidates_converted_employee_id_key" ON "candidates"("converted_employee_id");

-- CreateIndex
CREATE INDEX "candidates_organization_id_idx" ON "candidates"("organization_id");

-- CreateIndex
CREATE INDEX "candidates_email_idx" ON "candidates"("email");

-- CreateIndex
CREATE INDEX "candidates_referrer_employee_id_idx" ON "candidates"("referrer_employee_id");

-- CreateIndex
CREATE INDEX "candidates_is_blacklisted_idx" ON "candidates"("is_blacklisted");

-- CreateIndex
CREATE UNIQUE INDEX "candidates_organization_id_email_key" ON "candidates"("organization_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "job_applications_hired_employee_id_key" ON "job_applications"("hired_employee_id");

-- CreateIndex
CREATE INDEX "job_applications_organization_id_idx" ON "job_applications"("organization_id");

-- CreateIndex
CREATE INDEX "job_applications_candidate_id_idx" ON "job_applications"("candidate_id");

-- CreateIndex
CREATE INDEX "job_applications_job_requisition_id_idx" ON "job_applications"("job_requisition_id");

-- CreateIndex
CREATE INDEX "job_applications_job_posting_id_idx" ON "job_applications"("job_posting_id");

-- CreateIndex
CREATE INDEX "job_applications_current_stage_id_idx" ON "job_applications"("current_stage_id");

-- CreateIndex
CREATE INDEX "job_applications_status_idx" ON "job_applications"("status");

-- CreateIndex
CREATE UNIQUE INDEX "job_applications_candidate_id_job_requisition_id_key" ON "job_applications"("candidate_id", "job_requisition_id");

-- CreateIndex
CREATE INDEX "application_stage_history_application_id_idx" ON "application_stage_history"("application_id");

-- CreateIndex
CREATE INDEX "application_stage_history_to_stage_id_idx" ON "application_stage_history"("to_stage_id");

-- CreateIndex
CREATE INDEX "interviews_organization_id_idx" ON "interviews"("organization_id");

-- CreateIndex
CREATE INDEX "interviews_application_id_idx" ON "interviews"("application_id");

-- CreateIndex
CREATE INDEX "interviews_scheduled_at_idx" ON "interviews"("scheduled_at");

-- CreateIndex
CREATE INDEX "interviews_status_idx" ON "interviews"("status");

-- CreateIndex
CREATE INDEX "interview_panelists_employee_id_idx" ON "interview_panelists"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "interview_panelists_interview_id_employee_id_key" ON "interview_panelists"("interview_id", "employee_id");

-- CreateIndex
CREATE INDEX "interview_feedback_interview_id_idx" ON "interview_feedback"("interview_id");

-- CreateIndex
CREATE INDEX "interview_feedback_panelist_employee_id_idx" ON "interview_feedback"("panelist_employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "interview_feedback_interview_id_panelist_employee_id_key" ON "interview_feedback"("interview_id", "panelist_employee_id");

-- CreateIndex
CREATE INDEX "offers_organization_id_idx" ON "offers"("organization_id");

-- CreateIndex
CREATE INDEX "offers_application_id_idx" ON "offers"("application_id");

-- CreateIndex
CREATE INDEX "offers_status_idx" ON "offers"("status");

-- CreateIndex
CREATE UNIQUE INDEX "offers_organization_id_offer_number_key" ON "offers"("organization_id", "offer_number");

-- AddForeignKey
ALTER TABLE "job_requisitions" ADD CONSTRAINT "job_requisitions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_requisitions" ADD CONSTRAINT "job_requisitions_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_requisitions" ADD CONSTRAINT "job_requisitions_designation_id_fkey" FOREIGN KEY ("designation_id") REFERENCES "designations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_requisitions" ADD CONSTRAINT "job_requisitions_hiring_manager_id_fkey" FOREIGN KEY ("hiring_manager_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_requisitions" ADD CONSTRAINT "job_requisitions_created_by_employee_id_fkey" FOREIGN KEY ("created_by_employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_requisitions" ADD CONSTRAINT "job_requisitions_approved_by_employee_id_fkey" FOREIGN KEY ("approved_by_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_postings" ADD CONSTRAINT "job_postings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_postings" ADD CONSTRAINT "job_postings_job_requisition_id_fkey" FOREIGN KEY ("job_requisition_id") REFERENCES "job_requisitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_stages" ADD CONSTRAINT "application_stages_job_posting_id_fkey" FOREIGN KEY ("job_posting_id") REFERENCES "job_postings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_referrer_employee_id_fkey" FOREIGN KEY ("referrer_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_converted_employee_id_fkey" FOREIGN KEY ("converted_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_job_requisition_id_fkey" FOREIGN KEY ("job_requisition_id") REFERENCES "job_requisitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_job_posting_id_fkey" FOREIGN KEY ("job_posting_id") REFERENCES "job_postings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_current_stage_id_fkey" FOREIGN KEY ("current_stage_id") REFERENCES "application_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_referrer_employee_id_fkey" FOREIGN KEY ("referrer_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_rejected_by_employee_id_fkey" FOREIGN KEY ("rejected_by_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_hired_employee_id_fkey" FOREIGN KEY ("hired_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_stage_history" ADD CONSTRAINT "application_stage_history_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "job_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_stage_history" ADD CONSTRAINT "application_stage_history_to_stage_id_fkey" FOREIGN KEY ("to_stage_id") REFERENCES "application_stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_stage_history" ADD CONSTRAINT "application_stage_history_moved_by_employee_id_fkey" FOREIGN KEY ("moved_by_employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "job_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "application_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_scheduled_by_employee_id_fkey" FOREIGN KEY ("scheduled_by_employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_panelists" ADD CONSTRAINT "interview_panelists_interview_id_fkey" FOREIGN KEY ("interview_id") REFERENCES "interviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_panelists" ADD CONSTRAINT "interview_panelists_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_feedback" ADD CONSTRAINT "interview_feedback_interview_id_fkey" FOREIGN KEY ("interview_id") REFERENCES "interviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_feedback" ADD CONSTRAINT "interview_feedback_panelist_employee_id_fkey" FOREIGN KEY ("panelist_employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "job_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_designation_id_fkey" FOREIGN KEY ("designation_id") REFERENCES "designations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_reporting_manager_id_fkey" FOREIGN KEY ("reporting_manager_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_extended_by_employee_id_fkey" FOREIGN KEY ("extended_by_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_rescinded_by_employee_id_fkey" FOREIGN KEY ("rescinded_by_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Partial unique index: at most one active offer (DRAFT/EXTENDED/ACCEPTED) per application
CREATE UNIQUE INDEX "offers_application_active_unique" ON "offers" ("application_id") WHERE "status" IN ('DRAFT', 'EXTENDED', 'ACCEPTED');
