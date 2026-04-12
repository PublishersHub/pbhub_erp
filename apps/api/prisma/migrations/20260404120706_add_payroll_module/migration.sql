-- CreateEnum
CREATE TYPE "SalaryComponentType" AS ENUM ('EARNING', 'DEDUCTION');

-- CreateEnum
CREATE TYPE "PayrollCycleStatus" AS ENUM ('DRAFT', 'PROCESSING', 'PROCESSED', 'FINALIZED');

-- CreateEnum
CREATE TYPE "PayrollAdjustmentType" AS ENUM ('EARNING', 'DEDUCTION');

-- CreateEnum
CREATE TYPE "PayrollAdjustmentCategory" AS ENUM ('BONUS', 'REIMBURSEMENT', 'PENALTY', 'OVERTIME_PAY', 'LOAN_REPAYMENT', 'OTHER');

-- CreateTable
CREATE TABLE "salary_components" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "SalaryComponentType" NOT NULL,
    "description" TEXT,
    "is_taxable" BOOLEAN NOT NULL DEFAULT false,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "salary_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_salary_structures" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "effective_from" DATE NOT NULL,
    "gross_salary" DECIMAL(12,2) NOT NULL,
    "total_deductions" DECIMAL(12,2) NOT NULL,
    "net_salary" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_salary_structures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_salary_components" (
    "id" TEXT NOT NULL,
    "employee_salary_structure_id" TEXT NOT NULL,
    "salary_component_id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_salary_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_cycles" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "status" "PayrollCycleStatus" NOT NULL DEFAULT 'DRAFT',
    "total_gross" DECIMAL(12,2),
    "total_deductions" DECIMAL(12,2),
    "total_net" DECIMAL(12,2),
    "employee_count" INTEGER,
    "generated_at" TIMESTAMP(3),
    "finalized_at" TIMESTAMP(3),
    "finalized_by_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payrolls" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "payroll_cycle_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "total_working_days" DECIMAL(5,2) NOT NULL,
    "paid_leave_days" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "unpaid_leave_days" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "half_days" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "holiday_days" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "effective_working_days" DECIMAL(5,2) NOT NULL,
    "base_salary" DECIMAL(12,2) NOT NULL,
    "gross_earnings" DECIMAL(12,2) NOT NULL,
    "total_deductions" DECIMAL(12,2) NOT NULL,
    "total_adjustments" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "loss_of_pay_deduction" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "net_payable" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payrolls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_line_items" (
    "id" TEXT NOT NULL,
    "payroll_id" TEXT NOT NULL,
    "salary_component_id" TEXT NOT NULL,
    "component_name" TEXT NOT NULL,
    "component_code" TEXT NOT NULL,
    "type" "SalaryComponentType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_adjustments" (
    "id" TEXT NOT NULL,
    "payroll_id" TEXT NOT NULL,
    "type" "PayrollAdjustmentType" NOT NULL,
    "category" "PayrollAdjustmentCategory" NOT NULL DEFAULT 'OTHER',
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "added_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "salary_components_organization_id_idx" ON "salary_components"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "salary_components_organization_id_code_key" ON "salary_components"("organization_id", "code");

-- CreateIndex
CREATE INDEX "employee_salary_structures_organization_id_idx" ON "employee_salary_structures"("organization_id");

-- CreateIndex
CREATE INDEX "employee_salary_structures_employee_id_idx" ON "employee_salary_structures"("employee_id");

-- CreateIndex
CREATE INDEX "employee_salary_structures_employee_id_effective_from_idx" ON "employee_salary_structures"("employee_id", "effective_from");

-- CreateIndex
CREATE UNIQUE INDEX "employee_salary_components_employee_salary_structure_id_sal_key" ON "employee_salary_components"("employee_salary_structure_id", "salary_component_id");

-- CreateIndex
CREATE INDEX "payroll_cycles_organization_id_idx" ON "payroll_cycles"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_cycles_organization_id_year_month_key" ON "payroll_cycles"("organization_id", "year", "month");

-- CreateIndex
CREATE INDEX "payrolls_organization_id_idx" ON "payrolls"("organization_id");

-- CreateIndex
CREATE INDEX "payrolls_payroll_cycle_id_idx" ON "payrolls"("payroll_cycle_id");

-- CreateIndex
CREATE INDEX "payrolls_employee_id_idx" ON "payrolls"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "payrolls_payroll_cycle_id_employee_id_key" ON "payrolls"("payroll_cycle_id", "employee_id");

-- CreateIndex
CREATE INDEX "payroll_line_items_payroll_id_idx" ON "payroll_line_items"("payroll_id");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_line_items_payroll_id_salary_component_id_key" ON "payroll_line_items"("payroll_id", "salary_component_id");

-- CreateIndex
CREATE INDEX "payroll_adjustments_payroll_id_idx" ON "payroll_adjustments"("payroll_id");

-- AddForeignKey
ALTER TABLE "salary_components" ADD CONSTRAINT "salary_components_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_salary_structures" ADD CONSTRAINT "employee_salary_structures_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_salary_structures" ADD CONSTRAINT "employee_salary_structures_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_salary_components" ADD CONSTRAINT "employee_salary_components_employee_salary_structure_id_fkey" FOREIGN KEY ("employee_salary_structure_id") REFERENCES "employee_salary_structures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_salary_components" ADD CONSTRAINT "employee_salary_components_salary_component_id_fkey" FOREIGN KEY ("salary_component_id") REFERENCES "salary_components"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_cycles" ADD CONSTRAINT "payroll_cycles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_cycles" ADD CONSTRAINT "payroll_cycles_finalized_by_id_fkey" FOREIGN KEY ("finalized_by_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payrolls" ADD CONSTRAINT "payrolls_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payrolls" ADD CONSTRAINT "payrolls_payroll_cycle_id_fkey" FOREIGN KEY ("payroll_cycle_id") REFERENCES "payroll_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payrolls" ADD CONSTRAINT "payrolls_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_line_items" ADD CONSTRAINT "payroll_line_items_payroll_id_fkey" FOREIGN KEY ("payroll_id") REFERENCES "payrolls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_line_items" ADD CONSTRAINT "payroll_line_items_salary_component_id_fkey" FOREIGN KEY ("salary_component_id") REFERENCES "salary_components"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_adjustments" ADD CONSTRAINT "payroll_adjustments_payroll_id_fkey" FOREIGN KEY ("payroll_id") REFERENCES "payrolls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_adjustments" ADD CONSTRAINT "payroll_adjustments_added_by_id_fkey" FOREIGN KEY ("added_by_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
