import { get, post, patch, del } from './api';
import { API_BASE_URL } from './utils';
import { getToken } from './auth';
import type {
  SalaryComponent,
  CreateSalaryComponentPayload,
  UpdateSalaryComponentPayload,
  EmployeeSalaryStructure,
  SetSalaryStructurePayload,
  PreviewSalaryStructurePayload,
  SalaryStructurePreview,
  PayrollCycle,
  CreatePayrollCyclePayload,
  PayrollGenerationResult,
  Payroll,
  AddPayrollAdjustmentPayload,
} from '@/types/payroll';

// ─── Salary Components ─────────────────────

export function listSalaryComponents() {
  return get<SalaryComponent[]>('/api/salary-components');
}

export function getSalaryComponent(id: string) {
  return get<SalaryComponent>(`/api/salary-components/${id}`);
}

export function createSalaryComponent(payload: CreateSalaryComponentPayload) {
  return post<SalaryComponent>('/api/salary-components', payload);
}

export function updateSalaryComponent(id: string, payload: UpdateSalaryComponentPayload) {
  return patch<SalaryComponent>(`/api/salary-components/${id}`, payload);
}

export function deactivateSalaryComponent(id: string) {
  return del<SalaryComponent>(`/api/salary-components/${id}`);
}

// ─── Salary Structures ─────────────────────

export function setSalaryStructure(payload: SetSalaryStructurePayload) {
  return post<EmployeeSalaryStructure>('/api/salary-structures', payload);
}

export function previewSalaryStructure(payload: PreviewSalaryStructurePayload) {
  return post<SalaryStructurePreview>('/api/salary-structures/preview', payload);
}

export function getEmployeeSalaryStructure(employeeId: string) {
  return get<EmployeeSalaryStructure>(`/api/salary-structures/employee/${employeeId}`);
}

export function getEmployeeSalaryHistory(employeeId: string) {
  return get<EmployeeSalaryStructure[]>(`/api/salary-structures/employee/${employeeId}/history`);
}

// ─── Payroll Cycles ────────────────────────

export function listPayrollCycles(year?: number) {
  const q = year ? `?year=${year}` : '';
  return get<PayrollCycle[]>(`/api/payroll-cycles${q}`);
}

export function getPayrollCycle(id: string) {
  return get<PayrollCycle>(`/api/payroll-cycles/${id}`);
}

export function createPayrollCycle(payload: CreatePayrollCyclePayload) {
  return post<PayrollCycle>('/api/payroll-cycles', payload);
}

export function generatePayroll(cycleId: string) {
  return post<PayrollGenerationResult>(`/api/payroll-cycles/${cycleId}/generate`, {});
}

export function regeneratePayroll(cycleId: string) {
  return post<PayrollGenerationResult>(`/api/payroll-cycles/${cycleId}/regenerate`, {});
}

export function finalizePayroll(cycleId: string) {
  return patch<PayrollCycle>(`/api/payroll-cycles/${cycleId}/finalize`, {});
}

// ─── Payrolls (Payslips) ───────────────────

export function getMyPayslips(year?: number) {
  const q = year ? `?year=${year}` : '';
  return get<Payroll[]>(`/api/payrolls/my${q}`);
}

export function getMyPayslipDetail(cycleId: string) {
  return get<Payroll>(`/api/payrolls/my/${cycleId}`);
}

export function getCyclePayrolls(cycleId: string) {
  return get<Payroll[]>(`/api/payrolls/cycle/${cycleId}`);
}

export function getEmployeePayroll(employeeId: string, cycleId: string) {
  return get<Payroll>(`/api/payrolls/employee/${employeeId}/cycle/${cycleId}`);
}

export function addPayrollAdjustment(payrollId: string, payload: AddPayrollAdjustmentPayload) {
  return post<Payroll>(`/api/payrolls/${payrollId}/adjustments`, payload);
}

export function removePayrollAdjustment(adjustmentId: string) {
  return del<Payroll>(`/api/payrolls/adjustments/${adjustmentId}`);
}

// ─── PDF Download ──────────────────────────

export async function downloadPayslipPdf(payrollId: string, filename: string) {
  const token = getToken();
  const res = await fetch(`${API_BASE_URL}/api/payrolls/${payrollId}/pdf`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
