-- CreateEnum
CREATE TYPE "OnboardingInstanceStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OnboardingTaskStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "OnboardingTaskAssigneeRole" AS ENUM ('NEW_HIRE', 'MANAGER', 'HR', 'IT', 'CUSTOM');

-- CreateTable
CREATE TABLE "onboarding_templates" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "onboarding_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboarding_template_tasks" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assignee_role" "OnboardingTaskAssigneeRole" NOT NULL,
    "offset_days" INTEGER NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "allow_document" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "onboarding_template_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboarding_instances" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "template_id" TEXT,
    "template_name" TEXT NOT NULL,
    "joining_date" DATE NOT NULL,
    "status" "OnboardingInstanceStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "cancel_reason" TEXT,
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "onboarding_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboarding_tasks" (
    "id" TEXT NOT NULL,
    "onboarding_instance_id" TEXT NOT NULL,
    "template_task_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assignee_role" "OnboardingTaskAssigneeRole" NOT NULL,
    "assignee_employee_id" TEXT,
    "sort_order" INTEGER NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "allow_document" BOOLEAN NOT NULL DEFAULT false,
    "due_date" DATE NOT NULL,
    "status" "OnboardingTaskStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "completed_by_user_id" TEXT,
    "blocked_reason" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "onboarding_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboarding_task_documents" (
    "id" TEXT NOT NULL,
    "onboarding_task_id" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "uploaded_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "onboarding_task_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "onboarding_templates_organization_id_idx" ON "onboarding_templates"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_templates_organization_id_name_key" ON "onboarding_templates"("organization_id", "name");

-- CreateIndex
CREATE INDEX "onboarding_template_tasks_template_id_idx" ON "onboarding_template_tasks"("template_id");

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_template_tasks_template_id_sort_order_key" ON "onboarding_template_tasks"("template_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_instances_employee_id_key" ON "onboarding_instances"("employee_id");

-- CreateIndex
CREATE INDEX "onboarding_instances_organization_id_idx" ON "onboarding_instances"("organization_id");

-- CreateIndex
CREATE INDEX "onboarding_instances_status_idx" ON "onboarding_instances"("status");

-- CreateIndex
CREATE INDEX "onboarding_tasks_onboarding_instance_id_idx" ON "onboarding_tasks"("onboarding_instance_id");

-- CreateIndex
CREATE INDEX "onboarding_tasks_assignee_employee_id_idx" ON "onboarding_tasks"("assignee_employee_id");

-- CreateIndex
CREATE INDEX "onboarding_tasks_status_idx" ON "onboarding_tasks"("status");

-- CreateIndex
CREATE INDEX "onboarding_task_documents_onboarding_task_id_idx" ON "onboarding_task_documents"("onboarding_task_id");

-- AddForeignKey
ALTER TABLE "onboarding_templates" ADD CONSTRAINT "onboarding_templates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_template_tasks" ADD CONSTRAINT "onboarding_template_tasks_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "onboarding_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_instances" ADD CONSTRAINT "onboarding_instances_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_instances" ADD CONSTRAINT "onboarding_instances_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_instances" ADD CONSTRAINT "onboarding_instances_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "onboarding_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_tasks" ADD CONSTRAINT "onboarding_tasks_onboarding_instance_id_fkey" FOREIGN KEY ("onboarding_instance_id") REFERENCES "onboarding_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_tasks" ADD CONSTRAINT "onboarding_tasks_assignee_employee_id_fkey" FOREIGN KEY ("assignee_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_task_documents" ADD CONSTRAINT "onboarding_task_documents_onboarding_task_id_fkey" FOREIGN KEY ("onboarding_task_id") REFERENCES "onboarding_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Partial unique index: at most one active default template per organization
CREATE UNIQUE INDEX "onboarding_templates_default_unique" ON "onboarding_templates" ("organization_id") WHERE "is_default" = true AND "is_active" = true;
