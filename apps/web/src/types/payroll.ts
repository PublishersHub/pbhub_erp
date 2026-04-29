// ─── Enums ───────────────────────────────────

export type SalaryComponentType = 'EARNING' | 'DEDUCTION';
export type PayrollCycleStatus = 'DRAFT' | 'PROCESSING' | 'PROCESSED' | 'FINALIZED';
export type PayrollAdjustmentType = 'EARNING' | 'DEDUCTION';
export type PayrollAdjustmentCategory =
  | 'BONUS'
  | 'REIMBURSEMENT'
  | 'PENALTY'
  | 'OVERTIME_PAY'
  | 'LOAN_REPAYMENT'
  | 'OTHER';

// ─── Embedded refs ──────────────────────────

export interface EmployeeRef {
  id: string;
  firstName: string;
  lastName: string;
  employeeCode?: string;
}

// ─── Salary Component ───────────────────────

export interface SalaryComponent {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  type: SalaryComponentType;
  description: string | null;
  isTaxable: boolean;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Salary Structure ───────────────────────

export interface SalaryStructureComponent {
  id: string;
  employeeSalaryStructureId: string;
  salaryComponentId: string;
  amount: string; // Decimal
  createdAt: string;
  updatedAt: string;
  salaryComponent: {
    id: string;
    name: string;
    code: string;
    type: SalaryComponentType;
  };
}

export interface EmployeeSalaryStructure {
  id: string;
  organizationId: string;
  employeeId: string;
  effectiveFrom: string;
  grossSalary: string; // Decimal
  totalDeductions: string; // Decimal
  netSalary: string; // Decimal
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  components: SalaryStructureComponent[];
}

// ─── Payroll Cycle ──────────────────────────

export interface PayrollCycle {
  id: string;
  organizationId: string;
  year: number;
  month: number;
  periodStart: string;
  periodEnd: string;
  status: PayrollCycleStatus;
  totalGross: string | null;
  totalDeductions: string | null;
  totalNet: string | null;
  employeeCount: number | null;
  generatedAt: string | null;
  finalizedAt: string | null;
  finalizedById: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  finalizedBy?: EmployeeRef | null;
}

// ─── Payroll (Payslip) ─────────────────────

export interface PayrollLineItem {
  id: string;
  payrollId: string;
  salaryComponentId: string;
  componentName: string;
  componentCode: string;
  type: SalaryComponentType;
  amount: string; // Decimal
  sortOrder: number;
  createdAt: string;
}

export interface PayrollAdjustment {
  id: string;
  payrollId: string;
  type: PayrollAdjustmentType;
  category: PayrollAdjustmentCategory;
  description: string;
  amount: string; // Decimal
  addedById: string;
  createdAt: string;
  updatedAt: string;
  addedBy: { id: string; firstName: string; lastName: string };
}

export interface Payroll {
  id: string;
  organizationId: string;
  payrollCycleId: string;
  employeeId: string;
  totalWorkingDays: string;
  paidLeaveDays: string;
  unpaidLeaveDays: string;
  halfDays: string;
  holidayDays: string;
  effectiveWorkingDays: string;
  baseSalary: string;
  grossEarnings: string;
  totalDeductions: string;
  totalAdjustments: string;
  lossOfPayDeduction: string;
  netPayable: string;
  createdAt: string;
  updatedAt: string;
  payrollCycle?: {
    id: string;
    year: number;
    month: number;
    status: PayrollCycleStatus;
    periodStart: string;
    periodEnd: string;
  };
  employee?: EmployeeRef;
  lineItems?: PayrollLineItem[];
  adjustments?: PayrollAdjustment[];
}

export interface PayrollGenerationResult {
  cycleId: string;
  payrollCount: number;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  warnings: { employeeId: string; employeeCode: string; reason: string }[];
}

// ─── Payloads ───────────────────────────────

export interface CreateSalaryComponentPayload {
  name: string;
  code: string;
  type: SalaryComponentType;
  description?: string;
  isTaxable?: boolean;
  isDefault?: boolean;
  sortOrder?: number;
}

export interface UpdateSalaryComponentPayload {
  name?: string;
  description?: string;
  isTaxable?: boolean;
  isDefault?: boolean;
  isActive?: boolean;
  sortOrder?: number;
}

export interface SetSalaryStructurePayload {
  employeeId: string;
  effectiveFrom: string;
  notes?: string;
  components: { salaryComponentId: string; amount: number }[];
}

export interface CreatePayrollCyclePayload {
  year: number;
  month: number;
  notes?: string;
}

export interface AddPayrollAdjustmentPayload {
  type: PayrollAdjustmentType;
  category?: PayrollAdjustmentCategory;
  description: string;
  amount: number;
}
