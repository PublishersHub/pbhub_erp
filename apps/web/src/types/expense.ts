// ─── Enums ───────────────────────────────────

export type ExpenseClaimStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'MANAGER_APPROVED'
  | 'FINANCE_APPROVED'
  | 'REJECTED'
  | 'REIMBURSED'
  | 'CANCELLED';

export type ExpenseApprovalDecision = 'APPROVED' | 'REJECTED';
export type ExpenseApproverRole = 'MANAGER' | 'FINANCE';

// ─── Embedded refs ──────────────────────────

export interface EmployeeRef {
  id: string;
  firstName: string;
  lastName: string;
  employeeCode?: string;
}

// ─── Expense Category ───────────────────────

export interface ExpenseCategory {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Expense Policy ─────────────────────────

export interface ExpensePolicy {
  id: string;
  organizationId: string;
  name: string;
  maxClaimAmount: string | null;
  maxItemAmount: string | null;
  receiptRequiredAbove: string | null;
  autoApproveBelow: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Expense Item ───────────────────────────

export interface ExpenseItem {
  id: string;
  expenseClaimId: string;
  expenseCategoryId: string;
  description: string;
  amount: string;
  expenseDate: string;
  receiptUrl: string | null;
  receiptFileName: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  expenseCategory?: { id: string; name: string; code: string };
}

// ─── Expense Approval Action ────────────────

export interface ExpenseApprovalAction {
  id: string;
  expenseClaimId: string;
  approverEmployeeId: string;
  approverRole: ExpenseApproverRole;
  action: ExpenseApprovalDecision;
  remarks: string | null;
  createdAt: string;
  approverEmployee?: EmployeeRef;
}

// ─── Expense Claim ──────────────────────────

export interface ExpenseClaim {
  id: string;
  organizationId: string;
  employeeId: string;
  expensePolicyId: string | null;
  claimNumber: string;
  title: string;
  description: string | null;
  totalAmount: string;
  status: ExpenseClaimStatus;
  submittedAt: string | null;
  managerDecisionAt: string | null;
  financeDecisionAt: string | null;
  finalDecisionAt: string | null;
  finalDecisionById: string | null;
  reimbursedAt: string | null;
  reimbursedById: string | null;
  payrollAdjustmentId: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
  employee?: EmployeeRef;
  expensePolicy?: { id: string; name: string } | null;
  finalDecisionBy?: EmployeeRef | null;
  reimbursedBy?: EmployeeRef | null;
  items?: ExpenseItem[];
  approvalActions?: ExpenseApprovalAction[];
  payrollAdjustment?: {
    id: string;
    payrollId: string;
    type: string;
    category: string;
    description: string;
    amount: string;
  } | null;
}

// ─── Payloads ───────────────────────────────

export interface ExpenseItemPayload {
  expenseCategoryId: string;
  description: string;
  amount: number;
  expenseDate: string;
  receiptUrl?: string;
  receiptFileName?: string;
  notes?: string;
}

export interface CreateExpenseClaimPayload {
  title: string;
  description?: string;
  expensePolicyId?: string;
  items: ExpenseItemPayload[];
}

export interface UpdateExpenseItemPayload extends ExpenseItemPayload {
  id?: string;
}

export interface UpdateExpenseClaimPayload {
  title?: string;
  description?: string;
  expensePolicyId?: string;
  items?: UpdateExpenseItemPayload[];
}

export interface ReviewExpenseClaimPayload {
  action: ExpenseApprovalDecision;
  remarks?: string;
}

export interface CancelExpenseClaimPayload {
  cancelReason?: string;
}

export interface ReimburseExpenseClaimPayload {
  payrollId: string;
}

export interface CreateExpensePolicyPayload {
  name: string;
  maxClaimAmount?: number;
  maxItemAmount?: number;
  receiptRequiredAbove?: number;
  autoApproveBelow?: number;
}

export interface UpdateExpensePolicyPayload {
  name?: string;
  maxClaimAmount?: number;
  maxItemAmount?: number;
  receiptRequiredAbove?: number;
  autoApproveBelow?: number;
  isActive?: boolean;
}

export interface CreateExpenseCategoryPayload {
  name: string;
  code: string;
  description?: string;
}

export interface UpdateExpenseCategoryPayload {
  name?: string;
  description?: string;
  isActive?: boolean;
}
