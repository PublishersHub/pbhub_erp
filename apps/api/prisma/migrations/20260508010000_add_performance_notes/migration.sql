-- CreateTable
CREATE TABLE "employee_performance_notes" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "is_private" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_performance_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "employee_performance_notes_employee_id_created_at_idx" ON "employee_performance_notes"("employee_id", "created_at");

-- AddForeignKey
ALTER TABLE "employee_performance_notes" ADD CONSTRAINT "employee_performance_notes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_performance_notes" ADD CONSTRAINT "employee_performance_notes_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_performance_notes" ADD CONSTRAINT "employee_performance_notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
