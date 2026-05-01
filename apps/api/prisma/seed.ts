import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ============================================
// Permission definitions
// ============================================

const PERMISSIONS = [
  // Organization
  { code: 'organization.read', name: 'View Organization', module: 'organization' },
  { code: 'organization.manage', name: 'Manage Organization', module: 'organization' },

  // Users
  { code: 'user.read', name: 'View Users', module: 'user' },
  { code: 'user.create', name: 'Create Users', module: 'user' },
  { code: 'user.update', name: 'Update Users', module: 'user' },
  { code: 'user.delete', name: 'Delete Users', module: 'user' },
  { code: 'user.manage_roles', name: 'Manage User Roles', module: 'user' },

  // Roles
  { code: 'role.read', name: 'View Roles', module: 'role' },
  { code: 'role.manage', name: 'Manage Roles', module: 'role' },

  // Employee
  { code: 'employee.read', name: 'View Employees', module: 'employee' },
  { code: 'employee.create', name: 'Create Employees', module: 'employee' },
  { code: 'employee.update', name: 'Update Employees', module: 'employee' },
  { code: 'employee.delete', name: 'Delete Employees', module: 'employee' },
  { code: 'employee.read_sensitive', name: 'View Sensitive Employee Data', module: 'employee' },

  // Attendance
  { code: 'attendance.checkin', name: 'Check In / Check Out', module: 'attendance' },
  { code: 'attendance.read_own', name: 'View Own Attendance', module: 'attendance' },
  { code: 'attendance.read', name: 'View All Attendance', module: 'attendance' },
  { code: 'attendance.manage', name: 'Manage Attendance', module: 'attendance' },
  { code: 'attendance.correct', name: 'Correct Attendance Records', module: 'attendance' },

  // Leave
  { code: 'leave.request', name: 'Request Leave', module: 'leave' },
  { code: 'leave.read_own', name: 'View Own Leave', module: 'leave' },
  { code: 'leave.read', name: 'View All Leave', module: 'leave' },
  { code: 'leave.approve', name: 'Approve / Reject Leave', module: 'leave' },
  { code: 'leave.manage', name: 'Manage Leave Policies', module: 'leave' },

  // Performance
  { code: 'performance.read_own', name: 'View Own Performance', module: 'performance' },
  { code: 'performance.read', name: 'View All Performance', module: 'performance' },
  { code: 'performance.create_goals', name: 'Create Goals', module: 'performance' },
  { code: 'performance.approve_goals', name: 'Approve Goals', module: 'performance' },
  { code: 'performance.review', name: 'Review Performance', module: 'performance' },
  { code: 'performance.manage', name: 'Manage Performance Cycles', module: 'performance' },

  // Payroll
  { code: 'payroll.read', name: 'View Payroll', module: 'payroll' },
  { code: 'payroll.read_own', name: 'View Own Payslips', module: 'payroll' },
  { code: 'payroll.read_sensitive', name: 'View Sensitive Payroll Data', module: 'payroll' },
  { code: 'payroll.run', name: 'Run Payroll', module: 'payroll' },
  { code: 'payroll.approve', name: 'Approve Payroll', module: 'payroll' },

  // Expense
  { code: 'expense.read_own', name: 'View Own Expenses', module: 'expense' },
  { code: 'expense.create', name: 'Create Expense Claims', module: 'expense' },
  { code: 'expense.read', name: 'View All Expenses', module: 'expense' },
  { code: 'expense.approve', name: 'Approve Expense Claims', module: 'expense' },
  { code: 'expense.manage', name: 'Manage Expense Categories & Policies', module: 'expense' },
  { code: 'expense.reimburse', name: 'Reimburse Expense Claims', module: 'expense' },

  // Loans
  { code: 'loan.request', name: 'Request Loan', module: 'loan' },
  { code: 'loan.read_own', name: 'View Own Loans', module: 'loan' },
  { code: 'loan.read', name: 'View All Loans', module: 'loan' },
  { code: 'loan.manage', name: 'Manage Loans', module: 'loan' },
  { code: 'loan.approve', name: 'Approve Loans', module: 'loan' },

  // Policies
  { code: 'policy.read', name: 'View Policies', module: 'policy' },
  { code: 'policy.acknowledge', name: 'Acknowledge Policies', module: 'policy' },
  { code: 'policy.create', name: 'Create Policies', module: 'policy' },
  { code: 'policy.publish', name: 'Publish Policies', module: 'policy' },
  { code: 'policy.manage', name: 'Manage Policies', module: 'policy' },

  // Reports
  { code: 'report.read', name: 'View Reports', module: 'report' },
  { code: 'report.manage', name: 'Manage Reports', module: 'report' },

  // Audit
  { code: 'audit.read', name: 'View Audit Logs', module: 'audit' },

  // Settings
  { code: 'settings.read', name: 'View Settings', module: 'settings' },
  { code: 'settings.manage', name: 'Manage Settings', module: 'settings' },

  // Notifications
  { code: 'notification.read_own', name: 'View Own Notifications', module: 'notification' },
  { code: 'notification.read', name: 'View All Notifications', module: 'notification' },
  { code: 'notification.manage', name: 'Manage Notification Templates', module: 'notification' },

  // Recruitment
  { code: 'recruitment.read_own', name: 'View Own Recruitment Items', module: 'recruitment' },
  { code: 'recruitment.read', name: 'View All Recruitment Data', module: 'recruitment' },
  { code: 'recruitment.requisition.create', name: 'Create Job Requisitions', module: 'recruitment' },
  { code: 'recruitment.requisition.approve', name: 'Approve Job Requisitions', module: 'recruitment' },
  { code: 'recruitment.posting.manage', name: 'Manage Job Postings', module: 'recruitment' },
  { code: 'recruitment.candidate.manage', name: 'Manage Candidates', module: 'recruitment' },
  { code: 'recruitment.application.manage', name: 'Manage Applications', module: 'recruitment' },
  { code: 'recruitment.interview.manage', name: 'Manage Interviews', module: 'recruitment' },
  { code: 'recruitment.offer.manage', name: 'Manage Offers', module: 'recruitment' },
  { code: 'recruitment.hire', name: 'Convert Candidate to Employee', module: 'recruitment' },

  // Onboarding
  { code: 'onboarding.read_own', name: 'View Own Onboarding', module: 'onboarding' },
  { code: 'onboarding.read', name: 'View All Onboarding', module: 'onboarding' },
  { code: 'onboarding.template.manage', name: 'Manage Onboarding Templates', module: 'onboarding' },
  { code: 'onboarding.instance.manage', name: 'Manage Onboarding Instances', module: 'onboarding' },
  { code: 'onboarding.task.update', name: 'Update Assigned Onboarding Tasks', module: 'onboarding' },
];

// ============================================
// Role → permission mappings
// ============================================

const ALL_PERMISSION_CODES = PERMISSIONS.map((p) => p.code);

const ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: ALL_PERMISSION_CODES,

  hr_admin: [
    'organization.read',
    'user.read', 'user.create', 'user.update', 'user.manage_roles',
    'role.read',
    'employee.read', 'employee.create', 'employee.update', 'employee.delete', 'employee.read_sensitive',
    'attendance.read', 'attendance.manage', 'attendance.correct',
    'leave.read', 'leave.approve', 'leave.manage',
    'performance.read', 'performance.manage', 'performance.approve_goals', 'performance.review',
    'payroll.read', 'payroll.run',
    'expense.read_own', 'expense.create', 'expense.read', 'expense.manage',
    'policy.read', 'policy.create', 'policy.publish', 'policy.manage',
    'report.read', 'report.manage',
    'audit.read',
    'settings.read', 'settings.manage',
    'notification.read_own', 'notification.read', 'notification.manage',
    'recruitment.read_own', 'recruitment.read',
    'recruitment.requisition.create', 'recruitment.requisition.approve',
    'recruitment.posting.manage', 'recruitment.candidate.manage',
    'recruitment.application.manage', 'recruitment.interview.manage',
    'recruitment.offer.manage', 'recruitment.hire',
    'onboarding.read_own', 'onboarding.read',
    'onboarding.template.manage', 'onboarding.instance.manage',
    'onboarding.task.update',
  ],

  manager: [
    'employee.read',
    'attendance.read',
    'leave.read', 'leave.approve',
    'performance.read', 'performance.create_goals', 'performance.approve_goals', 'performance.review',
    'expense.read_own', 'expense.create', 'expense.read', 'expense.approve',
    'report.read',
    'policy.read',
    'role.read',
    'notification.read_own',
    'recruitment.read_own', 'recruitment.read',
    'recruitment.requisition.create',
    'recruitment.interview.manage',
    'onboarding.read_own', 'onboarding.read', 'onboarding.task.update',
  ],

  employee: [
    'attendance.checkin', 'attendance.read_own',
    'leave.request', 'leave.read_own',
    'performance.read_own', 'performance.create_goals',
    'payroll.read_own',
    'expense.read_own', 'expense.create',
    'loan.request', 'loan.read_own',
    'policy.read', 'policy.acknowledge',
    'notification.read_own',
    'recruitment.read_own',
    'onboarding.read_own', 'onboarding.task.update',
  ],

  finance_admin: [
    'employee.read', 'employee.read_sensitive',
    'attendance.read',
    'payroll.read', 'payroll.read_sensitive', 'payroll.run', 'payroll.approve',
    'expense.read_own', 'expense.create', 'expense.read', 'expense.approve', 'expense.reimburse',
    'loan.read', 'loan.manage', 'loan.approve',
    'report.read',
    'audit.read',
    'role.read',
    'notification.read_own',
    'onboarding.read_own',
  ],

  recruiter: [
    'employee.read',
    'role.read',
    'notification.read_own',
    'recruitment.read_own', 'recruitment.read',
    'recruitment.requisition.create',
    'recruitment.posting.manage',
    'recruitment.candidate.manage',
    'recruitment.application.manage',
    'recruitment.interview.manage',
    'recruitment.offer.manage',
    'recruitment.hire',
    'onboarding.read_own', 'onboarding.read',
  ],
};

// ============================================
// System default notification templates
// ============================================

const NOTIFICATION_TEMPLATES = [
  // Leave
  { eventType: 'leave.submitted', subject: 'New leave request from {{employeeName}}', body: '{{employeeName}} submitted a {{leaveType}} leave request from {{startDate}} to {{endDate}}.' },
  { eventType: 'leave.approved', subject: 'Your leave request was approved', body: 'Your {{leaveType}} leave request from {{startDate}} to {{endDate}} was approved by {{approverName}}.' },
  { eventType: 'leave.rejected', subject: 'Your leave request was rejected', body: 'Your {{leaveType}} leave request from {{startDate}} to {{endDate}} was rejected by {{approverName}}. Reason: {{remarks}}' },
  { eventType: 'leave.cancelled', subject: 'Leave request cancelled', body: 'Your {{leaveType}} leave request from {{startDate}} to {{endDate}} has been cancelled.' },

  // Expense
  { eventType: 'expense.submitted', subject: 'New expense claim {{claimNumber}}', body: '{{employeeName}} submitted expense claim {{claimNumber}} ({{title}}) for {{totalAmount}}.' },
  { eventType: 'expense.manager_approved', subject: 'Expense claim awaits finance review: {{claimNumber}}', body: 'Claim {{claimNumber}} ({{title}}) from {{employeeName}} for {{totalAmount}} was approved by the manager and now awaits finance review.' },
  { eventType: 'expense.finance_approved', subject: 'Your expense claim was approved: {{claimNumber}}', body: 'Your expense claim {{claimNumber}} ({{title}}) for {{totalAmount}} was fully approved. Reimbursement is pending.' },
  { eventType: 'expense.rejected', subject: 'Your expense claim was rejected: {{claimNumber}}', body: 'Your expense claim {{claimNumber}} ({{title}}) was rejected by {{approverName}}. Reason: {{remarks}}' },
  { eventType: 'expense.reimbursed', subject: 'Your expense claim was reimbursed: {{claimNumber}}', body: 'Your expense claim {{claimNumber}} ({{title}}) for {{totalAmount}} was reimbursed via payroll.' },
  { eventType: 'expense.cancelled', subject: 'Expense claim cancelled: {{claimNumber}}', body: 'Expense claim {{claimNumber}} ({{title}}) has been cancelled.' },

  // Payroll
  { eventType: 'payroll.cycle_finalized', subject: 'Payroll finalized: {{cycleName}}', body: 'Your payslip for {{period}} is now available. Net payable: {{netPayable}}.' },

  // Performance
  { eventType: 'performance.cycle_status_changed', subject: 'Performance cycle update: {{cycleName}}', body: 'Performance cycle {{cycleName}} is now in {{status}} phase.' },
  { eventType: 'performance.goal_approved', subject: 'Goal approved: {{goalTitle}}', body: 'Your goal "{{goalTitle}}" was approved by {{reviewerName}}.' },
  { eventType: 'performance.goal_rejected', subject: 'Goal needs revision: {{goalTitle}}', body: 'Your goal "{{goalTitle}}" was rejected by {{reviewerName}}. Reason: {{remarks}}' },
  { eventType: 'performance.review_completed', subject: 'Performance review completed: {{cycleName}}', body: 'Your performance review for {{cycleName}} has been completed by {{reviewerName}}.' },

  // Attendance
  { eventType: 'attendance.correction_submitted', subject: 'Attendance correction request from {{employeeName}}', body: '{{employeeName}} submitted an attendance correction for {{correctionDate}}.' },
  { eventType: 'attendance.correction_decided', subject: 'Attendance correction {{status}}', body: 'Your attendance correction for {{correctionDate}} was {{status}} by {{reviewerName}}.' },

  // Recruitment
  { eventType: 'recruitment.requisition_submitted', subject: 'Requisition pending approval: {{requisitionNumber}}', body: '{{submitterName}} submitted requisition {{requisitionNumber}} for "{{title}}" ({{numberOfOpenings}} openings).' },
  { eventType: 'recruitment.requisition_approved', subject: 'Requisition approved: {{requisitionNumber}}', body: 'Your requisition {{requisitionNumber}} for "{{title}}" was approved by {{approverName}}.' },
  { eventType: 'recruitment.requisition_rejected', subject: 'Requisition rejected: {{requisitionNumber}}', body: 'Your requisition {{requisitionNumber}} for "{{title}}" was rejected by {{approverName}}. Reason: {{reason}}' },
  { eventType: 'recruitment.posting_published', subject: 'Job posting published: {{title}}', body: 'Job posting "{{title}}" is now live on {{channel}}.' },
  { eventType: 'recruitment.application_received', subject: 'New application for {{title}}', body: '{{candidateName}} applied for "{{title}}" via {{source}}.' },
  { eventType: 'recruitment.application_stage_changed', subject: 'Application moved to {{toStage}}', body: 'Application from {{candidateName}} for "{{title}}" moved from {{fromStage}} to {{toStage}}.' },
  { eventType: 'recruitment.application_rejected', subject: 'Application rejected: {{candidateName}}', body: 'Application from {{candidateName}} for "{{title}}" was rejected. Reason: {{reason}}' },
  { eventType: 'recruitment.application_withdrawn', subject: 'Application withdrawn: {{candidateName}}', body: 'Application from {{candidateName}} for "{{title}}" was withdrawn.' },
  { eventType: 'recruitment.interview_scheduled', subject: 'Interview scheduled: {{candidateName}}', body: 'A {{type}} interview with {{candidateName}} for "{{title}}" is scheduled for {{scheduledAt}} ({{mode}}).' },
  { eventType: 'recruitment.interview_cancelled', subject: 'Interview cancelled: {{candidateName}}', body: 'The interview with {{candidateName}} for "{{title}}" scheduled for {{scheduledAt}} was cancelled.' },
  { eventType: 'recruitment.interview_feedback_submitted', subject: 'Interview feedback received: {{candidateName}}', body: '{{panelistName}} submitted feedback for the interview with {{candidateName}}. Recommendation: {{recommendation}}' },
  { eventType: 'recruitment.offer_extended', subject: 'Offer extended: {{candidateName}}', body: 'An offer ({{offerNumber}}) was extended to {{candidateName}} for "{{title}}".' },
  { eventType: 'recruitment.offer_responded', subject: 'Offer response: {{candidateName}}', body: '{{candidateName}} has {{decision}} the offer {{offerNumber}} for "{{title}}".' },
  { eventType: 'recruitment.candidate_hired', subject: 'Candidate hired: {{candidateName}}', body: '{{candidateName}} has been hired as {{title}}. Employee code: {{employeeCode}}.' },

  // Onboarding
  { eventType: 'onboarding.started', subject: 'Onboarding started for {{employeeName}}', body: 'Onboarding for {{employeeName}} ({{employeeCode}}) has started. Joining date: {{joiningDate}}.' },
  { eventType: 'onboarding.task_assigned', subject: 'Onboarding task assigned: {{taskTitle}}', body: 'You have been assigned "{{taskTitle}}" for {{employeeName}}. Due: {{dueDate}}.' },
  { eventType: 'onboarding.task_completed', subject: 'Task completed: {{taskTitle}}', body: '"{{taskTitle}}" for {{employeeName}} was marked complete by {{completedBy}}.' },
  { eventType: 'onboarding.completed', subject: 'Onboarding complete: {{employeeName}}', body: 'All required tasks for {{employeeName}} have been completed.' },
];

// ============================================
// Helper: idempotent find-or-create for system roles
// (avoids upsert on nullable compound unique which Prisma cannot address)
// ============================================

async function upsertSystemRole(data: { name: string; slug: string; description: string }) {
  const existing = await prisma.role.findFirst({
    where: { slug: data.slug, organizationId: null, isSystem: true },
  });

  if (existing) {
    return prisma.role.update({
      where: { id: existing.id },
      data: { name: data.name, description: data.description },
    });
  }

  return prisma.role.create({
    data: {
      name: data.name,
      slug: data.slug,
      description: data.description,
      isSystem: true,
      organizationId: null,
    },
  });
}

// ============================================
// Seed function
// ============================================

async function main() {
  console.log('Seeding database...');

  // 1. Organization
  const org = await prisma.organization.upsert({
    where: { slug: 'pbhub' },
    update: {},
    create: {
      name: 'PbHub',
      slug: 'pbhub',
      isActive: true,
    },
  });
  console.log(`Organization: ${org.name} (${org.id})`);

  // 2. Permissions
  const permissionMap = new Map<string, string>();
  for (const perm of PERMISSIONS) {
    const record = await prisma.permission.upsert({
      where: { code: perm.code },
      update: { name: perm.name, module: perm.module },
      create: perm,
    });
    permissionMap.set(perm.code, record.id);
  }
  console.log(`Permissions: ${permissionMap.size} seeded`);

  // 3. System roles (using findFirst + create/update to avoid null-compound-unique issues)
  const ROLES = [
    { name: 'Super Admin', slug: 'super_admin', description: 'Full system access' },
    { name: 'HR Admin', slug: 'hr_admin', description: 'HR operations and employee management' },
    { name: 'Manager', slug: 'manager', description: 'Team management and approvals' },
    { name: 'Employee', slug: 'employee', description: 'Self-service access' },
    { name: 'Finance Admin', slug: 'finance_admin', description: 'Payroll and financial operations' },
    { name: 'Recruiter', slug: 'recruiter', description: 'Recruitment and applicant tracking' },
  ];

  const roleMap = new Map<string, string>();
  for (const role of ROLES) {
    const record = await upsertSystemRole(role);
    roleMap.set(role.slug, record.id);
  }
  console.log(`Roles: ${roleMap.size} seeded`);

  // 4. Role-permission assignments
  for (const [roleSlug, permCodes] of Object.entries(ROLE_PERMISSIONS)) {
    const roleId = roleMap.get(roleSlug)!;

    for (const code of permCodes) {
      const permissionId = permissionMap.get(code);
      if (!permissionId) continue;

      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId, permissionId } },
        update: {},
        create: { roleId, permissionId },
      });
    }
  }
  console.log('Role-permission assignments seeded');

  // 5. Super Admin account + membership in the seed org
  const passwordHash = await bcrypt.hash('admin123', 12);

  const account = await prisma.account.upsert({
    where: { email: 'admin@pbhub.com' },
    update: {},
    create: {
      email: 'admin@pbhub.com',
      passwordHash,
      firstName: 'Super',
      lastName: 'Admin',
      isActive: true,
    },
  });
  console.log(`Account: ${account.email} (${account.id})`);

  const superAdmin = await prisma.user.upsert({
    where: {
      accountId_organizationId: {
        accountId: account.id,
        organizationId: org.id,
      },
    },
    update: {},
    create: {
      accountId: account.id,
      organizationId: org.id,
      isActive: true,
    },
  });

  // Assign super_admin role
  const superAdminRoleId = roleMap.get('super_admin')!;
  await prisma.userRole.upsert({
    where: {
      userId_roleId_organizationId: {
        userId: superAdmin.id,
        roleId: superAdminRoleId,
        organizationId: org.id,
      },
    },
    update: {},
    create: {
      userId: superAdmin.id,
      roleId: superAdminRoleId,
      organizationId: org.id,
    },
  });
  console.log(`Super Admin: ${account.email} (password: admin123)`);

  // ─── Dev data ────────────────────────────────────────────────────────────────

  // 6. Departments
  const deptDefs = [
    { name: 'Engineering', code: 'ENG' },
    { name: 'Product', code: 'PROD' },
    { name: 'Human Resources', code: 'HR' },
    { name: 'Finance', code: 'FIN' },
    { name: 'Operations', code: 'OPS' },
  ];
  const deptMap = new Map<string, string>(); // code → id
  for (const d of deptDefs) {
    const dept = await prisma.department.upsert({
      where: { organizationId_code: { organizationId: org.id, code: d.code } },
      update: { name: d.name },
      create: { organizationId: org.id, name: d.name, code: d.code, isActive: true },
    });
    deptMap.set(d.code, dept.id);
  }
  console.log(`Departments: ${deptMap.size} seeded`);

  // 7. Designations
  const desgDefs = [
    { name: 'Junior Engineer', level: 1 },
    { name: 'Software Engineer', level: 2 },
    { name: 'Senior Software Engineer', level: 3 },
    { name: 'Engineering Manager', level: 4 },
    { name: 'Product Manager', level: 3 },
    { name: 'HR Specialist', level: 2 },
    { name: 'HR Manager', level: 4 },
    { name: 'Finance Specialist', level: 2 },
  ];
  const desgMap = new Map<string, string>(); // name → id
  for (const d of desgDefs) {
    const desg = await prisma.designation.upsert({
      where: { organizationId_name: { organizationId: org.id, name: d.name } },
      update: { level: d.level },
      create: { organizationId: org.id, name: d.name, level: d.level, isActive: true },
    });
    desgMap.set(d.name, desg.id);
  }
  console.log(`Designations: ${desgMap.size} seeded`);

  // 8. Employees (Account → User → Employee → EmploymentDetail → UserRole)
  const empPassword = await bcrypt.hash('password123', 12);

  // Phase 1: employees with no reporting manager
  const phase1 = [
    {
      code: 'EMP001', firstName: 'Sara', lastName: 'Khan',
      email: 'sara.khan@pbhub.com', dept: 'ENG', desg: 'Engineering Manager',
      joiningDate: new Date('2024-08-01'), role: 'manager',
    },
    {
      code: 'EMP005', firstName: 'Fatima', lastName: 'Hussain',
      email: 'fatima.hussain@pbhub.com', dept: 'PROD', desg: 'Product Manager',
      joiningDate: new Date('2024-10-01'), role: 'manager',
    },
    {
      code: 'EMP006', firstName: 'Bilal', lastName: 'Sheikh',
      email: 'bilal.sheikh@pbhub.com', dept: 'HR', desg: 'HR Manager',
      joiningDate: new Date('2024-09-01'), role: 'hr_admin',
    },
    {
      code: 'EMP008', firstName: 'Usman', lastName: 'Tariq',
      email: 'usman.tariq@pbhub.com', dept: 'FIN', desg: 'Finance Specialist',
      joiningDate: new Date('2024-12-01'), role: 'finance_admin',
    },
  ];

  // Phase 2: employees with a reporting manager (managerCode resolves after phase 1)
  const phase2 = [
    {
      code: 'EMP002', firstName: 'Ali', lastName: 'Ahmed',
      email: 'ali.ahmed@pbhub.com', dept: 'ENG', desg: 'Senior Software Engineer',
      joiningDate: new Date('2024-11-15'), role: 'employee', managerCode: 'EMP001',
    },
    {
      code: 'EMP003', firstName: 'Ayesha', lastName: 'Malik',
      email: 'ayesha.malik@pbhub.com', dept: 'ENG', desg: 'Software Engineer',
      joiningDate: new Date('2025-03-01'), role: 'employee', managerCode: 'EMP001',
    },
    {
      code: 'EMP004', firstName: 'Hamza', lastName: 'Iqbal',
      email: 'hamza.iqbal@pbhub.com', dept: 'ENG', desg: 'Junior Engineer',
      joiningDate: new Date('2025-09-01'), role: 'employee', managerCode: 'EMP002',
    },
    {
      code: 'EMP007', firstName: 'Zainab', lastName: 'Raza',
      email: 'zainab.raza@pbhub.com', dept: 'HR', desg: 'HR Specialist',
      joiningDate: new Date('2025-04-15'), role: 'employee', managerCode: 'EMP006',
    },
  ];

  // Helper: seed one employee record
  const empCodeToId = new Map<string, string>(); // empCode → Employee.id

  async function seedEmployee(def: {
    code: string; firstName: string; lastName: string; email: string;
    dept: string; desg: string; joiningDate: Date; role: string; managerCode?: string;
  }) {
    // Account
    const acct = await prisma.account.upsert({
      where: { email: def.email },
      update: {},
      create: {
        email: def.email, passwordHash: empPassword,
        firstName: def.firstName, lastName: def.lastName, isActive: true,
      },
    });
    // User (membership)
    const membership = await prisma.user.upsert({
      where: { accountId_organizationId: { accountId: acct.id, organizationId: org.id } },
      update: {},
      create: { accountId: acct.id, organizationId: org.id, isActive: true },
    });
    // Employee
    const reportingManagerId = def.managerCode ? (empCodeToId.get(def.managerCode) ?? null) : null;
    const emp = await prisma.employee.upsert({
      where: { organizationId_employeeCode: { organizationId: org.id, employeeCode: def.code } },
      update: {
        userId: membership.id,
        departmentId: deptMap.get(def.dept)!,
        designationId: desgMap.get(def.desg)!,
        reportingManagerId,
      },
      create: {
        organizationId: org.id,
        userId: membership.id,
        employeeCode: def.code,
        firstName: def.firstName,
        lastName: def.lastName,
        departmentId: deptMap.get(def.dept)!,
        designationId: desgMap.get(def.desg)!,
        reportingManagerId,
        isActive: true,
      },
    });
    empCodeToId.set(def.code, emp.id);
    // EmploymentDetail (upsert on unique employeeId)
    await prisma.employeeEmploymentDetail.upsert({
      where: { employeeId: emp.id },
      update: {},
      create: {
        employeeId: emp.id,
        employmentType: 'FULL_TIME',
        joiningDate: def.joiningDate,
        employmentStatus: 'ACTIVE',
      },
    });
    // UserRole
    const roleId = roleMap.get(def.role)!;
    await prisma.userRole.upsert({
      where: { userId_roleId_organizationId: { userId: membership.id, roleId, organizationId: org.id } },
      update: {},
      create: { userId: membership.id, roleId, organizationId: org.id },
    });
  }

  for (const def of phase1) await seedEmployee(def);
  for (const def of phase2) await seedEmployee({ ...def });
  console.log(`Employees: ${empCodeToId.size} seeded`);

  // 9. Leave policies
  const leavePolicyDefs = [
    { name: 'Annual Leave', code: 'ANNUAL', annualQuota: 24, maxConsecutive: 14, allowHalfDay: true, isPaid: true },
    { name: 'Sick Leave', code: 'SICK', annualQuota: 12, maxConsecutive: 7, allowHalfDay: true, isPaid: true },
    { name: 'Casual Leave', code: 'CASUAL', annualQuota: 8, maxConsecutive: 3, allowHalfDay: true, isPaid: true },
    { name: 'Unpaid Leave', code: 'UNPAID', annualQuota: 30, maxConsecutive: 10, allowHalfDay: false, isPaid: false },
  ];
  for (const lp of leavePolicyDefs) {
    await prisma.leavePolicy.upsert({
      where: { organizationId_code: { organizationId: org.id, code: lp.code } },
      update: { name: lp.name, annualQuotaDefault: lp.annualQuota, maxConsecutiveDays: lp.maxConsecutive, allowHalfDay: lp.allowHalfDay, isPaid: lp.isPaid },
      create: {
        organizationId: org.id, name: lp.name, code: lp.code,
        annualQuotaDefault: lp.annualQuota, maxConsecutiveDays: lp.maxConsecutive,
        allowHalfDay: lp.allowHalfDay, isPaid: lp.isPaid, isActive: true,
      },
    });
  }
  console.log(`Leave policies: ${leavePolicyDefs.length} seeded`);

  // 10. Holidays (2026)
  const holidayDefs = [
    { name: "New Year's Day", date: new Date('2026-01-01'), isOptional: false },
    { name: 'Pakistan Day', date: new Date('2026-03-23'), isOptional: false },
    { name: 'Labour Day', date: new Date('2026-05-01'), isOptional: false },
    { name: 'Independence Day', date: new Date('2026-08-14'), isOptional: false },
    { name: 'Iqbal Day', date: new Date('2026-11-09'), isOptional: true },
    { name: 'Christmas Day', date: new Date('2026-12-25'), isOptional: false },
    { name: 'Eid ul-Fitr (Day 1)', date: new Date('2026-04-21'), isOptional: false },
    { name: 'Eid ul-Adha (Day 1)', date: new Date('2026-06-27'), isOptional: false },
  ];
  for (const h of holidayDefs) {
    await prisma.holiday.upsert({
      where: { organizationId_date: { organizationId: org.id, date: h.date } },
      update: { name: h.name, isOptional: h.isOptional },
      create: { organizationId: org.id, name: h.name, date: h.date, isOptional: h.isOptional, isActive: true },
    });
  }
  console.log(`Holidays: ${holidayDefs.length} seeded`);

  // 11. Default attendance policy
  await prisma.attendancePolicy.upsert({
    where: { organizationId_name: { organizationId: org.id, name: 'Standard 9-to-6' } },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Standard 9-to-6',
      policyType: 'FIXED',
      startTime: '09:00',
      endTime: '18:00',
      minHoursPerDay: 8.0,
      graceMinutesLate: 15,
      graceMinutesEarly: 0,
      halfDayThresholdMinutes: 240,
      workingDays: [1, 2, 3, 4, 5],
      isActive: true,
    },
  });
  console.log('Attendance policy: Standard 9-to-6 seeded');

  // 12. Salary components
  const salaryComponentDefs = [
    { name: 'Basic Salary', code: 'BASIC', type: 'EARNING' as const, isTaxable: true, isDefault: true, sortOrder: 1 },
    { name: 'House Rent Allowance', code: 'HRA', type: 'EARNING' as const, isTaxable: false, isDefault: true, sortOrder: 2 },
    { name: 'Conveyance Allowance', code: 'CONV', type: 'EARNING' as const, isTaxable: false, isDefault: true, sortOrder: 3 },
    { name: 'Medical Allowance', code: 'MED', type: 'EARNING' as const, isTaxable: false, isDefault: true, sortOrder: 4 },
    { name: 'Provident Fund', code: 'PF', type: 'DEDUCTION' as const, isTaxable: false, isDefault: true, sortOrder: 10 },
    { name: 'Income Tax', code: 'TAX', type: 'DEDUCTION' as const, isTaxable: true, isDefault: true, sortOrder: 11 },
  ];
  for (const sc of salaryComponentDefs) {
    await prisma.salaryComponent.upsert({
      where: { organizationId_code: { organizationId: org.id, code: sc.code } },
      update: { name: sc.name, type: sc.type, isTaxable: sc.isTaxable, sortOrder: sc.sortOrder },
      create: { organizationId: org.id, ...sc, isActive: true },
    });
  }
  console.log(`Salary components: ${salaryComponentDefs.length} seeded`);

  // 13. Onboarding template
  const existingTemplate = await prisma.onboardingTemplate.findFirst({
    where: { organizationId: org.id, name: 'Standard Onboarding' },
  });
  if (!existingTemplate) {
    await prisma.onboardingTemplate.create({
      data: {
        organizationId: org.id,
        name: 'Standard Onboarding',
        description: 'Default onboarding flow for new hires',
        isDefault: true,
        isActive: true,
        tasks: {
          create: [
            { sortOrder: 0, title: 'Sign offer letter', assigneeRole: 'NEW_HIRE', offsetDays: 0, isRequired: true, allowDocument: true },
            { sortOrder: 1, title: 'Submit ID documents', assigneeRole: 'NEW_HIRE', offsetDays: 1, isRequired: true, allowDocument: true },
            { sortOrder: 2, title: 'Setup work laptop', assigneeRole: 'IT', offsetDays: 1, isRequired: true, allowDocument: false },
            { sortOrder: 3, title: 'Welcome call with manager', assigneeRole: 'MANAGER', offsetDays: 1, isRequired: true, allowDocument: false },
            { sortOrder: 4, title: 'Complete HR orientation', assigneeRole: 'HR', offsetDays: 3, isRequired: true, allowDocument: false },
            { sortOrder: 5, title: 'Set up email and Slack', assigneeRole: 'IT', offsetDays: 1, isRequired: true, allowDocument: false },
            { sortOrder: 6, title: 'First-week project briefing', assigneeRole: 'MANAGER', offsetDays: 5, isRequired: false, allowDocument: false },
          ],
        },
      },
    });
    console.log('Onboarding template: Standard Onboarding seeded (7 tasks)');
  } else {
    console.log('Onboarding template: Standard Onboarding already exists, skipped');
  }

  // ─────────────────────────────────────────────────────────────────────────────

  // 14. System default notification templates (organizationId = null)
  // Using findFirst + create/update to avoid null-compound-unique issues
  for (const tpl of NOTIFICATION_TEMPLATES) {
    const existing = await prisma.notificationTemplate.findFirst({
      where: { organizationId: null, eventType: tpl.eventType, channel: 'IN_APP' },
    });
    if (existing) {
      await prisma.notificationTemplate.update({
        where: { id: existing.id },
        data: { subject: tpl.subject, body: tpl.body },
      });
    } else {
      await prisma.notificationTemplate.create({
        data: {
          organizationId: null,
          eventType: tpl.eventType,
          channel: 'IN_APP',
          subject: tpl.subject,
          body: tpl.body,
        },
      });
    }
  }
  console.log(`Notification templates: ${NOTIFICATION_TEMPLATES.length} system defaults seeded`);

  console.log('\nSeed complete.');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
