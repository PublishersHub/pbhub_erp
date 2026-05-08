-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assignee_id" TEXT NOT NULL,
    "assigned_by_id" TEXT NOT NULL,
    "due_date" DATE,
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tasks_organization_id_idx" ON "tasks"("organization_id");

-- CreateIndex
CREATE INDEX "tasks_assignee_id_status_idx" ON "tasks"("assignee_id", "status");

-- CreateIndex
CREATE INDEX "tasks_due_date_idx" ON "tasks"("due_date");

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
