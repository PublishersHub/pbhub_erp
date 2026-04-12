-- CreateEnum
CREATE TYPE "ExpenseClaimStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'MANAGER_APPROVED', 'FINANCE_APPROVED', 'REJECTED', 'REIMBURSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ExpenseApprovalDecision" AS ENUM ('APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ExpenseApproverRole" AS ENUM ('MANAGER', 'FINANCE');

-- CreateTable
CREATE TABLE "expense_categories" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_policies" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "max_claim_amount" DECIMAL(12,2),
    "max_item_amount" DECIMAL(12,2),
    "receipt_required_above" DECIMAL(12,2),
    "auto_approve_below" DECIMAL(12,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_claims" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "expense_policy_id" TEXT,
    "claim_number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "total_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "ExpenseClaimStatus" NOT NULL DEFAULT 'DRAFT',
    "submitted_at" TIMESTAMP(3),
    "manager_decision_at" TIMESTAMP(3),
    "finance_decision_at" TIMESTAMP(3),
    "final_decision_at" TIMESTAMP(3),
    "final_decision_by_id" TEXT,
    "reimbursed_at" TIMESTAMP(3),
    "reimbursed_by_id" TEXT,
    "payroll_adjustment_id" TEXT,
    "cancelled_at" TIMESTAMP(3),
    "cancel_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_items" (
    "id" TEXT NOT NULL,
    "expense_claim_id" TEXT NOT NULL,
    "expense_category_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "expense_date" DATE NOT NULL,
    "receipt_url" TEXT,
    "receipt_file_name" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_approval_actions" (
    "id" TEXT NOT NULL,
    "expense_claim_id" TEXT NOT NULL,
    "approver_employee_id" TEXT NOT NULL,
    "approver_role" "ExpenseApproverRole" NOT NULL,
    "action" "ExpenseApprovalDecision" NOT NULL,
    "remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_approval_actions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "expense_categories_organization_id_idx" ON "expense_categories"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "expense_categories_organization_id_code_key" ON "expense_categories"("organization_id", "code");

-- CreateIndex
CREATE INDEX "expense_policies_organization_id_idx" ON "expense_policies"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "expense_policies_organization_id_name_key" ON "expense_policies"("organization_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "expense_claims_payroll_adjustment_id_key" ON "expense_claims"("payroll_adjustment_id");

-- CreateIndex
CREATE INDEX "expense_claims_organization_id_idx" ON "expense_claims"("organization_id");

-- CreateIndex
CREATE INDEX "expense_claims_employee_id_idx" ON "expense_claims"("employee_id");

-- CreateIndex
CREATE INDEX "expense_claims_status_idx" ON "expense_claims"("status");

-- CreateIndex
CREATE UNIQUE INDEX "expense_claims_organization_id_claim_number_key" ON "expense_claims"("organization_id", "claim_number");

-- CreateIndex
CREATE INDEX "expense_items_expense_claim_id_idx" ON "expense_items"("expense_claim_id");

-- CreateIndex
CREATE INDEX "expense_approval_actions_expense_claim_id_idx" ON "expense_approval_actions"("expense_claim_id");

-- CreateIndex
CREATE INDEX "expense_approval_actions_approver_employee_id_idx" ON "expense_approval_actions"("approver_employee_id");

-- AddForeignKey
ALTER TABLE "expense_categories" ADD CONSTRAINT "expense_categories_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_policies" ADD CONSTRAINT "expense_policies_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_claims" ADD CONSTRAINT "expense_claims_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_claims" ADD CONSTRAINT "expense_claims_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_claims" ADD CONSTRAINT "expense_claims_expense_policy_id_fkey" FOREIGN KEY ("expense_policy_id") REFERENCES "expense_policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_claims" ADD CONSTRAINT "expense_claims_final_decision_by_id_fkey" FOREIGN KEY ("final_decision_by_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_claims" ADD CONSTRAINT "expense_claims_reimbursed_by_id_fkey" FOREIGN KEY ("reimbursed_by_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_claims" ADD CONSTRAINT "expense_claims_payroll_adjustment_id_fkey" FOREIGN KEY ("payroll_adjustment_id") REFERENCES "payroll_adjustments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_items" ADD CONSTRAINT "expense_items_expense_claim_id_fkey" FOREIGN KEY ("expense_claim_id") REFERENCES "expense_claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_items" ADD CONSTRAINT "expense_items_expense_category_id_fkey" FOREIGN KEY ("expense_category_id") REFERENCES "expense_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_approval_actions" ADD CONSTRAINT "expense_approval_actions_expense_claim_id_fkey" FOREIGN KEY ("expense_claim_id") REFERENCES "expense_claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_approval_actions" ADD CONSTRAINT "expense_approval_actions_approver_employee_id_fkey" FOREIGN KEY ("approver_employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
