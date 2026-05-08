-- CreateEnum
CREATE TYPE "SalaryFormulaBase" AS ENUM ('CTC', 'BASIC', 'GROSS', 'FIXED', 'CUSTOM');

-- AlterTable: add formula columns to salary_components
ALTER TABLE "salary_components"
  ADD COLUMN "formula_base"  "SalaryFormulaBase" NOT NULL DEFAULT 'FIXED',
  ADD COLUMN "formula_value" DECIMAL(10, 4);

-- AlterTable: add denormalized CTC to employee_salary_structures
ALTER TABLE "employee_salary_structures"
  ADD COLUMN "ctc" DECIMAL(15, 2) NOT NULL DEFAULT 0;
