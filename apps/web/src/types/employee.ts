// ─── Enums ───────────────────────────────────

export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN';

export type EmploymentStatus =
  | 'ACTIVE'
  | 'PROBATION'
  | 'NOTICE_PERIOD'
  | 'RESIGNED'
  | 'TERMINATED';

// ─── Embedded relation shapes ────────────────

export interface DepartmentRef {
  id: string;
  name: string;
  code: string;
}

export interface DesignationRef {
  id: string;
  name: string;
  level?: number;
}

export interface EmployeeRef {
  id: string;
  firstName: string;
  lastName: string;
  employeeCode?: string;
}

// ─── Employment Detail ──────────────────────

export interface EmploymentDetail {
  id: string;
  employeeId: string;
  employmentType: EmploymentType;
  joiningDate: string;
  confirmationDate: string | null;
  probationEndDate: string | null;
  resignationDate: string | null;
  lastWorkingDate: string | null;
  employmentStatus: EmploymentStatus;
  createdAt: string;
  updatedAt: string;
}

// ─── Employee ───────────────────────────────

export interface Employee {
  id: string;
  organizationId: string;
  userId: string | null;
  employeeCode: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  gender: Gender | null;
  phone: string | null;
  personalEmail: string | null;
  profileImageUrl: string | null;
  departmentId: string | null;
  designationId: string | null;
  reportingManagerId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  department?: DepartmentRef | null;
  designation?: DesignationRef | null;
  reportingManager?: EmployeeRef | null;
  employmentDetail?: EmploymentDetail | null;
  directReports?: EmployeeRef[];
  documents?: EmployeeDocument[];
}

export interface EmployeeDocument {
  id: string;
  employeeId: string;
  title: string;
  fileUrl: string;
  fileName: string | null;
  createdAt: string;
}

// ─── Department ─────────────────────────────

export interface Department {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  parentId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  parent?: DepartmentRef | null;
  children?: DepartmentRef[];
  _count?: { employees?: number };
}

// ─── Designation ────────────────────────────

export interface Designation {
  id: string;
  organizationId: string;
  name: string;
  level: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { employees?: number };
}

// ─── Payloads ───────────────────────────────

export interface CreateEmployeePayload {
  employeeCode: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  gender?: Gender;
  phone?: string;
  personalEmail?: string;
  departmentId?: string;
  designationId?: string;
  reportingManagerId?: string;
  userId?: string;
  employmentDetail?: CreateEmploymentDetailPayload;
}

export interface UpdateEmployeePayload {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: Gender;
  phone?: string;
  personalEmail?: string;
  departmentId?: string;
  designationId?: string;
  reportingManagerId?: string;
  userId?: string;
  /** Storage key from /api/uploads (purpose=profile-photo), or a legacy URL. */
  profileImageUrl?: string | null;
}

/**
 * Self-service patch payload — only fields a regular employee
 * (with `employee.read_own`) is allowed to mutate on themselves.
 */
export interface UpdateSelfEmployeePayload {
  profileImageUrl?: string | null;
}

export interface CreateEmploymentDetailPayload {
  employmentType: EmploymentType;
  joiningDate: string;
  confirmationDate?: string;
  probationEndDate?: string;
  employmentStatus?: EmploymentStatus;
}

export interface CreateDepartmentPayload {
  name: string;
  code: string;
  parentId?: string;
}

export interface CreateDesignationPayload {
  name: string;
  level?: number;
}

// ─── Filters ────────────────────────────────

export interface EmployeeFilters {
  departmentId?: string;
  designationId?: string;
  isActive?: string;
  search?: string;
}
