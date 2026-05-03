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
    'attendance.checkin', 'attendance.read_own',
    'leave.read', 'leave.approve', 'leave.manage',
    'leave.request', 'leave.read_own',
    'performance.read', 'performance.manage', 'performance.approve_goals', 'performance.review',
    'performance.read_own', 'performance.create_goals',
    'payroll.read', 'payroll.run',
    'payroll.read_own',
    'expense.read_own', 'expense.create', 'expense.read', 'expense.manage',
    'loan.request', 'loan.read_own',
    'policy.read', 'policy.acknowledge', 'policy.create', 'policy.publish', 'policy.manage',
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
    'attendance.checkin', 'attendance.read_own',
    'leave.read', 'leave.approve',
    'leave.request', 'leave.read_own',
    'performance.read', 'performance.create_goals', 'performance.approve_goals', 'performance.review',
    'performance.read_own',
    'payroll.read_own',
    'expense.read_own', 'expense.create', 'expense.read', 'expense.approve',
    'loan.request', 'loan.read_own',
    'report.read',
    'policy.read', 'policy.acknowledge',
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
    'attendance.checkin', 'attendance.read_own',
    'leave.request', 'leave.read_own',
    'performance.read_own', 'performance.create_goals',
    'payroll.read', 'payroll.read_sensitive', 'payroll.run', 'payroll.approve',
    'payroll.read_own',
    'expense.read_own', 'expense.create', 'expense.read', 'expense.approve', 'expense.reimburse',
    'loan.read', 'loan.manage', 'loan.approve',
    'loan.request',
    'report.read',
    'audit.read',
    'role.read',
    'policy.read', 'policy.acknowledge',
    'notification.read_own',
    'onboarding.read_own',
  ],

  recruiter: [
    'employee.read',
    'role.read',
    'attendance.checkin', 'attendance.read_own',
    'leave.request', 'leave.read_own',
    'performance.read_own', 'performance.create_goals',
    'payroll.read_own',
    'expense.read_own', 'expense.create',
    'loan.request', 'loan.read_own',
    'policy.read', 'policy.acknowledge',
    'notification.read_own',
    'recruitment.read_own', 'recruitment.read',
    'recruitment.requisition.create',
    'recruitment.posting.manage',
    'recruitment.candidate.manage',
    'recruitment.application.manage',
    'recruitment.interview.manage',
    'recruitment.offer.manage',
    'recruitment.hire',
    'onboarding.read_own', 'onboarding.read', 'onboarding.task.update',
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
    update: { timezone: 'Asia/Karachi' },
    create: {
      name: 'PbHub',
      slug: 'pbhub',
      timezone: 'Asia/Karachi',
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

  // ─────────────────────────────────────────────────────────────────────────────
  // Helper: look up an employee id by code (populated during phase 1+2 seed above)
  // ─────────────────────────────────────────────────────────────────────────────

  // Re-fetch employee IDs from DB in case this seed run didn't build empCodeToId
  const allEmployees = await prisma.employee.findMany({
    where: { organizationId: org.id },
    select: { id: true, employeeCode: true, userId: true },
  });
  const empById = new Map<string, string>(); // code → id
  const empUserIdByCode = new Map<string, string>(); // code → userId
  for (const e of allEmployees) {
    empById.set(e.employeeCode, e.id);
    if (e.userId) empUserIdByCode.set(e.employeeCode, e.userId);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Section A: Attendance policy assignments (all employees → "Standard 9-to-6")
  // ─────────────────────────────────────────────────────────────────────────────

  const attendancePolicy = await prisma.attendancePolicy.findFirst({
    where: { organizationId: org.id, name: 'Standard 9-to-6' },
  });
  if (!attendancePolicy) throw new Error('Attendance policy not found');

  // Joining dates per code
  const joiningDates: Record<string, Date> = {
    EMP001: new Date('2024-08-01'),
    EMP002: new Date('2024-11-15'),
    EMP003: new Date('2025-03-01'),
    EMP004: new Date('2025-09-01'),
    EMP005: new Date('2024-10-01'),
    EMP006: new Date('2024-09-01'),
    EMP007: new Date('2025-04-15'),
    EMP008: new Date('2024-12-01'),
  };

  let attendanceAssignCount = 0;
  for (const [code, joiningDate] of Object.entries(joiningDates)) {
    const employeeId = empById.get(code)!;
    const existing = await prisma.employeeAttendancePolicyAssignment.findFirst({
      where: { employeeId, attendancePolicyId: attendancePolicy.id },
    });
    if (!existing) {
      await prisma.employeeAttendancePolicyAssignment.create({
        data: {
          employeeId,
          attendancePolicyId: attendancePolicy.id,
          effectiveFrom: joiningDate,
        },
      });
      attendanceAssignCount++;
    }
  }
  console.log(`Section A: created ${attendanceAssignCount} attendance policy assignments`);

  // ─────────────────────────────────────────────────────────────────────────────
  // Section B: Leave policy assignments + balances for current year
  // ─────────────────────────────────────────────────────────────────────────────

  const leavePolicies = await prisma.leavePolicy.findMany({
    where: { organizationId: org.id },
  });
  const leavePolicyByCode = new Map(leavePolicies.map((lp) => [lp.code, lp]));

  const currentYear = new Date().getUTCFullYear();
  let leavePolicyAssignCount = 0;
  let leaveBalanceCount = 0;

  for (const [code, joiningDate] of Object.entries(joiningDates)) {
    const employeeId = empById.get(code)!;
    for (const lp of leavePolicies) {
      // Upsert assignment
      const existingAssign = await prisma.employeeLeavePolicyAssignment.findFirst({
        where: { employeeId, leavePolicyId: lp.id },
      });
      if (!existingAssign) {
        await prisma.employeeLeavePolicyAssignment.create({
          data: {
            organizationId: org.id,
            employeeId,
            leavePolicyId: lp.id,
            effectiveFrom: joiningDate,
          },
        });
        leavePolicyAssignCount++;
      }

      // Upsert balance
      const entitled = Number(lp.annualQuotaDefault);
      await prisma.employeeLeaveBalance.upsert({
        where: { employeeId_leavePolicyId_year: { employeeId, leavePolicyId: lp.id, year: currentYear } },
        update: {},
        create: {
          organizationId: org.id,
          employeeId,
          leavePolicyId: lp.id,
          year: currentYear,
          totalEntitled: entitled,
          used: 0,
          carriedForward: 0,
          adjustments: 0,
          balance: entitled,
        },
      });
      leaveBalanceCount++;
    }
  }
  console.log(`Section B: created ${leavePolicyAssignCount} leave policy assignments, ${leaveBalanceCount} leave balances`);

  // ─────────────────────────────────────────────────────────────────────────────
  // Section C: Leave requests
  // ─────────────────────────────────────────────────────────────────────────────

  const existingLeaveCount = await prisma.leaveRequest.count({ where: { organizationId: org.id } });
  if (existingLeaveCount === 0) {
    const now = new Date();
    const todayMs = new Date(now.toISOString().slice(0, 10) + 'T00:00:00Z').getTime();
    const d = (offsetDays: number) => new Date(todayMs + offsetDays * 86400000);

    const annualPolicy = leavePolicyByCode.get('ANNUAL')!;
    const sickPolicy = leavePolicyByCode.get('SICK')!;
    const casualPolicy = leavePolicyByCode.get('CASUAL')!;

    const hamzaId = empById.get('EMP004')!;
    const ayeshaId = empById.get('EMP003')!;
    const aliId = empById.get('EMP002')!;
    const saraId = empById.get('EMP001')!;
    const zainabId = empById.get('EMP007')!;
    const bilalId = empById.get('EMP006')!;
    const fatimaId = empById.get('EMP005')!;

    // Helper: create leave request with days
    async function createLeaveRequest(params: {
      employeeId: string;
      leavePolicyId: string;
      startDate: Date;
      endDate: Date;
      totalDays: number;
      reason: string;
      status: 'PENDING' | 'APPROVED' | 'REJECTED';
      managerDecisionAt?: Date;
      hrDecisionAt?: Date;
      finalDecisionAt?: Date;
      finalDecisionById?: string;
    }) {
      const req = await prisma.leaveRequest.create({
        data: {
          organizationId: org.id,
          employeeId: params.employeeId,
          leavePolicyId: params.leavePolicyId,
          startDate: params.startDate,
          endDate: params.endDate,
          totalDays: params.totalDays,
          reason: params.reason,
          status: params.status,
          managerDecisionAt: params.managerDecisionAt,
          hrDecisionAt: params.hrDecisionAt,
          finalDecisionAt: params.finalDecisionAt,
          finalDecisionById: params.finalDecisionById,
        },
      });
      // Create day rows
      const days = params.totalDays;
      for (let i = 0; i < days; i++) {
        const dayDate = new Date(params.startDate.getTime() + i * 86400000);
        await prisma.leaveRequestDay.create({
          data: {
            leaveRequestId: req.id,
            date: dayDate,
            dayType: 'FULL_DAY',
            days: 1,
          },
        });
      }
      return req;
    }

    // 1. Hamza — ANNUAL, PENDING, today+3 to today+5 (3 days)
    await createLeaveRequest({
      employeeId: hamzaId,
      leavePolicyId: annualPolicy.id,
      startDate: d(3),
      endDate: d(5),
      totalDays: 3,
      reason: 'Family event',
      status: 'PENDING',
    });

    // 2. Ayesha — SICK, PENDING, today+1 to today+1 (1 day)
    await createLeaveRequest({
      employeeId: ayeshaId,
      leavePolicyId: sickPolicy.id,
      startDate: d(1),
      endDate: d(1),
      totalDays: 1,
      reason: "Doctor's appointment",
      status: 'PENDING',
    });

    // 3. Ali — ANNUAL, APPROVED, today-1 to today+2 (4 days)
    const aliLeave = await createLeaveRequest({
      employeeId: aliId,
      leavePolicyId: annualPolicy.id,
      startDate: d(-1),
      endDate: d(2),
      totalDays: 4,
      reason: 'Annual vacation',
      status: 'APPROVED',
      managerDecisionAt: now,
      hrDecisionAt: now,
      finalDecisionAt: now,
      finalDecisionById: bilalId,
    });
    await prisma.leaveApprovalAction.create({
      data: { leaveRequestId: aliLeave.id, approverEmployeeId: saraId, approverRole: 'MANAGER', action: 'APPROVED' },
    });
    await prisma.leaveApprovalAction.create({
      data: { leaveRequestId: aliLeave.id, approverEmployeeId: bilalId, approverRole: 'HR', action: 'APPROVED' },
    });
    // Decrement Ali's ANNUAL balance by 4
    await prisma.employeeLeaveBalance.updateMany({
      where: { employeeId: aliId, leavePolicyId: annualPolicy.id, year: currentYear },
      data: { used: 4, balance: Number(annualPolicy.annualQuotaDefault) - 4 },
    });

    // 4. Zainab — CASUAL, APPROVED, today to today+1 (2 days)
    const zainabLeave = await createLeaveRequest({
      employeeId: zainabId,
      leavePolicyId: casualPolicy.id,
      startDate: d(0),
      endDate: d(1),
      totalDays: 2,
      reason: 'Personal work',
      status: 'APPROVED',
      managerDecisionAt: now,
      hrDecisionAt: now,
      finalDecisionAt: now,
      finalDecisionById: bilalId,
    });
    await prisma.leaveApprovalAction.create({
      data: { leaveRequestId: zainabLeave.id, approverEmployeeId: bilalId, approverRole: 'MANAGER', action: 'APPROVED' },
    });
    await prisma.leaveApprovalAction.create({
      data: { leaveRequestId: zainabLeave.id, approverEmployeeId: bilalId, approverRole: 'HR', action: 'APPROVED' },
    });
    // Decrement Zainab's CASUAL balance by 2
    await prisma.employeeLeaveBalance.updateMany({
      where: { employeeId: zainabId, leavePolicyId: casualPolicy.id, year: currentYear },
      data: { used: 2, balance: Number(casualPolicy.annualQuotaDefault) - 2 },
    });

    // 5. Fatima — ANNUAL, APPROVED, today+10 to today+14 (5 days)
    const fatimaLeave = await createLeaveRequest({
      employeeId: fatimaId,
      leavePolicyId: annualPolicy.id,
      startDate: d(10),
      endDate: d(14),
      totalDays: 5,
      reason: 'Vacation',
      status: 'APPROVED',
      hrDecisionAt: now,
      finalDecisionAt: now,
      finalDecisionById: bilalId,
    });
    await prisma.leaveApprovalAction.create({
      data: { leaveRequestId: fatimaLeave.id, approverEmployeeId: bilalId, approverRole: 'HR', action: 'APPROVED' },
    });
    // Decrement Fatima's ANNUAL balance by 5
    await prisma.employeeLeaveBalance.updateMany({
      where: { employeeId: fatimaId, leavePolicyId: annualPolicy.id, year: currentYear },
      data: { used: 5, balance: Number(annualPolicy.annualQuotaDefault) - 5 },
    });

    // 6. Hamza — SICK, REJECTED, today-7 (1 day)
    const hamzaRejected = await createLeaveRequest({
      employeeId: hamzaId,
      leavePolicyId: sickPolicy.id,
      startDate: d(-7),
      endDate: d(-7),
      totalDays: 1,
      reason: 'Feeling unwell',
      status: 'REJECTED',
      managerDecisionAt: now,
      finalDecisionAt: now,
      finalDecisionById: aliId,
    });
    await prisma.leaveApprovalAction.create({
      data: { leaveRequestId: hamzaRejected.id, approverEmployeeId: aliId, approverRole: 'MANAGER', action: 'REJECTED', remarks: 'No prior notice' },
    });

    console.log('Section C: created 6 leave requests with days and approval actions');
  } else {
    console.log(`Section C: ${existingLeaveCount} leave requests already exist, skipped`);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Section D: Attendance logs + daily summaries for today
  // All timestamps are RELATIVE TO NOW so re-seeding never produces future logs.
  // ─────────────────────────────────────────────────────────────────────────────

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const todayDate = new Date(todayStr + 'T00:00:00Z');

  const todayLogsExist = await prisma.attendanceLog.findFirst({
    where: { organizationId: org.id, timestamp: { gte: new Date(todayStr + 'T00:00:00Z') } },
  });

  if (!todayLogsExist) {
    // Anchor the demo workday so the latest CHECK_OUT is ~30 min ago and
    // CHECK_INs are ~9 hours before that. Strictly past, regardless of run time.
    const minsAgo = (n: number) => new Date(now.getTime() - n * 60 * 1000);

    // EMP001 Sara: closed shift → PRESENT, ~555 min
    const saraId = empById.get('EMP001')!;
    const saraIn = minsAgo(585);
    const saraOut = minsAgo(30);
    await prisma.attendanceLog.create({ data: { organizationId: org.id, employeeId: saraId, logType: 'CHECK_IN', timestamp: saraIn, source: 'WEB' } });
    await prisma.attendanceLog.create({ data: { organizationId: org.id, employeeId: saraId, logType: 'CHECK_OUT', timestamp: saraOut, source: 'WEB' } });
    await prisma.attendanceDailySummary.upsert({
      where: { employeeId_date: { employeeId: saraId, date: todayDate } },
      update: {},
      create: {
        organizationId: org.id, employeeId: saraId, date: todayDate,
        status: 'PRESENT', firstCheckIn: saraIn, lastCheckOut: saraOut,
        totalWorkedMinutes: 555, lateMinutes: 0, earlyDepartureMinutes: 0, overtimeMinutes: 0,
      },
    });

    // EMP003 Ayesha: still working (open CHECK_IN ~4h ago, late arrival in seed-narrative) → LATE
    const ayeshaId2 = empById.get('EMP003')!;
    const ayeshaIn = minsAgo(240);
    await prisma.attendanceLog.create({ data: { organizationId: org.id, employeeId: ayeshaId2, logType: 'CHECK_IN', timestamp: ayeshaIn, source: 'WEB' } });
    await prisma.attendanceDailySummary.upsert({
      where: { employeeId_date: { employeeId: ayeshaId2, date: todayDate } },
      update: {},
      create: {
        organizationId: org.id, employeeId: ayeshaId2, date: todayDate,
        status: 'LATE', firstCheckIn: ayeshaIn, lastCheckOut: null,
        totalWorkedMinutes: 0, lateMinutes: 27, earlyDepartureMinutes: 0, overtimeMinutes: 0,
      },
    });

    // EMP004 Hamza: closed shift → PRESENT, ~502 min
    const hamzaId2 = empById.get('EMP004')!;
    const hamzaIn = minsAgo(540);
    const hamzaOut = minsAgo(38);
    await prisma.attendanceLog.create({ data: { organizationId: org.id, employeeId: hamzaId2, logType: 'CHECK_IN', timestamp: hamzaIn, source: 'WEB' } });
    await prisma.attendanceLog.create({ data: { organizationId: org.id, employeeId: hamzaId2, logType: 'CHECK_OUT', timestamp: hamzaOut, source: 'WEB' } });
    await prisma.attendanceDailySummary.upsert({
      where: { employeeId_date: { employeeId: hamzaId2, date: todayDate } },
      update: {},
      create: {
        organizationId: org.id, employeeId: hamzaId2, date: todayDate,
        status: 'PRESENT', firstCheckIn: hamzaIn, lastCheckOut: hamzaOut,
        totalWorkedMinutes: 502, lateMinutes: 0, earlyDepartureMinutes: 0, overtimeMinutes: 0,
      },
    });

    // EMP005 Fatima: closed shift → PRESENT, ~550 min
    const fatimaId2 = empById.get('EMP005')!;
    const fatimaIn = minsAgo(580);
    const fatimaOut = minsAgo(30);
    await prisma.attendanceLog.create({ data: { organizationId: org.id, employeeId: fatimaId2, logType: 'CHECK_IN', timestamp: fatimaIn, source: 'WEB' } });
    await prisma.attendanceLog.create({ data: { organizationId: org.id, employeeId: fatimaId2, logType: 'CHECK_OUT', timestamp: fatimaOut, source: 'WEB' } });
    await prisma.attendanceDailySummary.upsert({
      where: { employeeId_date: { employeeId: fatimaId2, date: todayDate } },
      update: {},
      create: {
        organizationId: org.id, employeeId: fatimaId2, date: todayDate,
        status: 'PRESENT', firstCheckIn: fatimaIn, lastCheckOut: fatimaOut,
        totalWorkedMinutes: 550, lateMinutes: 0, earlyDepartureMinutes: 0, overtimeMinutes: 0,
      },
    });

    // EMP006 Bilal: closed shift → PRESENT, ~570 min
    const bilalId2 = empById.get('EMP006')!;
    const bilalIn = minsAgo(600);
    const bilalOut = minsAgo(30);
    await prisma.attendanceLog.create({ data: { organizationId: org.id, employeeId: bilalId2, logType: 'CHECK_IN', timestamp: bilalIn, source: 'WEB' } });
    await prisma.attendanceLog.create({ data: { organizationId: org.id, employeeId: bilalId2, logType: 'CHECK_OUT', timestamp: bilalOut, source: 'WEB' } });
    await prisma.attendanceDailySummary.upsert({
      where: { employeeId_date: { employeeId: bilalId2, date: todayDate } },
      update: {},
      create: {
        organizationId: org.id, employeeId: bilalId2, date: todayDate,
        status: 'PRESENT', firstCheckIn: bilalIn, lastCheckOut: bilalOut,
        totalWorkedMinutes: 570, lateMinutes: 0, earlyDepartureMinutes: 0, overtimeMinutes: 0,
      },
    });

    // EMP002 Ali: on leave → ON_LEAVE summary
    const aliId2 = empById.get('EMP002')!;
    await prisma.attendanceDailySummary.upsert({
      where: { employeeId_date: { employeeId: aliId2, date: todayDate } },
      update: {},
      create: {
        organizationId: org.id, employeeId: aliId2, date: todayDate,
        status: 'ON_LEAVE', totalWorkedMinutes: 0, lateMinutes: 0, earlyDepartureMinutes: 0, overtimeMinutes: 0,
      },
    });

    // EMP007 Zainab: on leave → ON_LEAVE summary
    const zainabId2 = empById.get('EMP007')!;
    await prisma.attendanceDailySummary.upsert({
      where: { employeeId_date: { employeeId: zainabId2, date: todayDate } },
      update: {},
      create: {
        organizationId: org.id, employeeId: zainabId2, date: todayDate,
        status: 'ON_LEAVE', totalWorkedMinutes: 0, lateMinutes: 0, earlyDepartureMinutes: 0, overtimeMinutes: 0,
      },
    });

    // EMP008 Usman: ABSENT
    const usmanId = empById.get('EMP008')!;
    await prisma.attendanceDailySummary.upsert({
      where: { employeeId_date: { employeeId: usmanId, date: todayDate } },
      update: {},
      create: {
        organizationId: org.id, employeeId: usmanId, date: todayDate,
        status: 'ABSENT', totalWorkedMinutes: 0, lateMinutes: 0, earlyDepartureMinutes: 0, overtimeMinutes: 0,
      },
    });

    console.log('Section D: created today\'s attendance logs (10 logs) and 8 daily summaries');
  } else {
    console.log('Section D: today\'s attendance logs already exist, skipped');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Section E: Expense categories + policy + claims
  // ─────────────────────────────────────────────────────────────────────────────

  const expenseCategoryDefs = [
    { name: 'Travel', code: 'TRAVEL', description: 'Airfare, ground transport, lodging' },
    { name: 'Meals', code: 'MEALS', description: 'Meals while traveling or with clients' },
    { name: 'Office Supplies', code: 'OFFICE', description: 'Stationery, equipment under $500' },
    { name: 'Software', code: 'SOFTWARE', description: 'Subscriptions and licenses' },
  ];
  const expenseCatMap = new Map<string, string>(); // code → id
  for (const cat of expenseCategoryDefs) {
    const record = await prisma.expenseCategory.upsert({
      where: { organizationId_code: { organizationId: org.id, code: cat.code } },
      update: { name: cat.name, description: cat.description },
      create: { organizationId: org.id, name: cat.name, code: cat.code, description: cat.description, isActive: true },
    });
    expenseCatMap.set(cat.code, record.id);
  }
  console.log(`Section E: created/upserted ${expenseCategoryDefs.length} expense categories`);

  const expensePolicy = await prisma.expensePolicy.upsert({
    where: { organizationId_name: { organizationId: org.id, name: 'Standard Expense Policy' } },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Standard Expense Policy',
      maxClaimAmount: 10000,
      maxItemAmount: 5000,
      receiptRequiredAbove: 100,
      autoApproveBelow: null,
      isActive: true,
    },
  });
  console.log('Section E: upserted expense policy');

  const existingClaimCount = await prisma.expenseClaim.count({ where: { organizationId: org.id } });
  if (existingClaimCount === 0) {
    const nowMs = Date.now();
    const dExp = (offsetDays: number) => new Date(nowMs + offsetDays * 86400000);

    const aliId3 = empById.get('EMP002')!;
    const ayeshaId3 = empById.get('EMP003')!;
    const hamzaId3 = empById.get('EMP004')!;
    const saraId3 = empById.get('EMP001')!;
    const bilalId3 = empById.get('EMP006')!;
    const usmanId3 = empById.get('EMP008')!;

    // Claim 1: Ali — "Client dinner — Acme deal", SUBMITTED
    const claim1 = await prisma.expenseClaim.create({
      data: {
        organizationId: org.id,
        employeeId: aliId3,
        expensePolicyId: expensePolicy.id,
        claimNumber: 'CLM-0001',
        title: 'Client dinner — Acme deal',
        totalAmount: 145,
        status: 'SUBMITTED',
        submittedAt: dExp(-2),
      },
    });
    await prisma.expenseItem.create({
      data: {
        expenseClaimId: claim1.id,
        expenseCategoryId: expenseCatMap.get('MEALS')!,
        description: 'Client dinner at Café Alam',
        amount: 145,
        expenseDate: dExp(-2),
      },
    });

    // Claim 2: Ayesha — "Conference travel — ReactConf", SUBMITTED
    const claim2 = await prisma.expenseClaim.create({
      data: {
        organizationId: org.id,
        employeeId: ayeshaId3,
        expensePolicyId: expensePolicy.id,
        claimNumber: 'CLM-0002',
        title: 'Conference travel — ReactConf',
        totalAmount: 705,
        status: 'SUBMITTED',
        submittedAt: dExp(-3),
      },
    });
    await prisma.expenseItem.create({
      data: {
        expenseClaimId: claim2.id,
        expenseCategoryId: expenseCatMap.get('TRAVEL')!,
        description: 'Flights to ReactConf',
        amount: 620,
        expenseDate: dExp(-5),
      },
    });
    await prisma.expenseItem.create({
      data: {
        expenseClaimId: claim2.id,
        expenseCategoryId: expenseCatMap.get('MEALS')!,
        description: 'Meals during conference',
        amount: 85,
        expenseDate: dExp(-4),
      },
    });

    // Claim 3: Hamza — "Annual JetBrains license", MANAGER_APPROVED
    const claim3 = await prisma.expenseClaim.create({
      data: {
        organizationId: org.id,
        employeeId: hamzaId3,
        expensePolicyId: expensePolicy.id,
        claimNumber: 'CLM-0003',
        title: 'Annual JetBrains license',
        totalAmount: 250,
        status: 'MANAGER_APPROVED',
        submittedAt: dExp(-10),
        managerDecisionAt: dExp(-9),
        finalDecisionById: aliId3,
      },
    });
    await prisma.expenseItem.create({
      data: {
        expenseClaimId: claim3.id,
        expenseCategoryId: expenseCatMap.get('SOFTWARE')!,
        description: 'JetBrains All Products Pack annual license',
        amount: 250,
        expenseDate: dExp(-10),
      },
    });
    await prisma.expenseApprovalAction.create({
      data: {
        expenseClaimId: claim3.id,
        approverEmployeeId: aliId3,
        approverRole: 'MANAGER',
        action: 'APPROVED',
        remarks: 'Approved',
      },
    });

    // Claim 4: Sara — "Office monitor", REIMBURSED
    const claim4 = await prisma.expenseClaim.create({
      data: {
        organizationId: org.id,
        employeeId: saraId3,
        expensePolicyId: expensePolicy.id,
        claimNumber: 'CLM-0004',
        title: 'Office monitor',
        totalAmount: 349,
        status: 'REIMBURSED',
        submittedAt: dExp(-29),
        managerDecisionAt: dExp(-28),
        financeDecisionAt: dExp(-20),
        finalDecisionAt: dExp(-20),
        finalDecisionById: usmanId3,
        reimbursedAt: dExp(-15),
        reimbursedById: usmanId3,
      },
    });
    await prisma.expenseItem.create({
      data: {
        expenseClaimId: claim4.id,
        expenseCategoryId: expenseCatMap.get('OFFICE')!,
        description: 'Dell 24" monitor for home office',
        amount: 349,
        expenseDate: dExp(-30),
      },
    });
    await prisma.expenseApprovalAction.create({
      data: {
        expenseClaimId: claim4.id,
        approverEmployeeId: bilalId3,
        approverRole: 'MANAGER',
        action: 'APPROVED',
        remarks: 'Approved',
      },
    });
    await prisma.expenseApprovalAction.create({
      data: {
        expenseClaimId: claim4.id,
        approverEmployeeId: usmanId3,
        approverRole: 'FINANCE',
        action: 'APPROVED',
        remarks: 'Approved',
      },
    });

    // Claim 5: Hamza — "Coffee with candidate", REJECTED
    const claim5 = await prisma.expenseClaim.create({
      data: {
        organizationId: org.id,
        employeeId: hamzaId3,
        expensePolicyId: expensePolicy.id,
        claimNumber: 'CLM-0005',
        title: 'Coffee with candidate',
        totalAmount: 48,
        status: 'REJECTED',
        submittedAt: dExp(-15),
        managerDecisionAt: dExp(-14),
        finalDecisionAt: dExp(-14),
        finalDecisionById: aliId3,
      },
    });
    await prisma.expenseItem.create({
      data: {
        expenseClaimId: claim5.id,
        expenseCategoryId: expenseCatMap.get('MEALS')!,
        description: 'Coffee meeting with candidate',
        amount: 48,
        expenseDate: dExp(-15),
      },
    });
    await prisma.expenseApprovalAction.create({
      data: {
        expenseClaimId: claim5.id,
        approverEmployeeId: aliId3,
        approverRole: 'MANAGER',
        action: 'REJECTED',
        remarks: 'Not pre-approved',
      },
    });

    console.log('Section E: created 5 expense claims with items and approval actions');
  } else {
    console.log(`Section E: ${existingClaimCount} expense claims already exist, skipped`);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Section F: Recruitment activity
  // ─────────────────────────────────────────────────────────────────────────────

  const reqsExist = await prisma.jobRequisition.count({ where: { organizationId: org.id } });
  if (reqsExist === 0) {
    const nowMs2 = Date.now();
    const dR = (offsetDays: number) => new Date(nowMs2 + offsetDays * 86400000);

    const saraId4 = empById.get('EMP001')!;
    const fatimaId4 = empById.get('EMP005')!;
    const bilalId4 = empById.get('EMP006')!;
    const ayeshaId4 = empById.get('EMP003')!;

    // Requisitions
    const req1 = await prisma.jobRequisition.upsert({
      where: { organizationId_requisitionNumber: { organizationId: org.id, requisitionNumber: 'REQ-2026-001' } },
      update: {},
      create: {
        organizationId: org.id,
        requisitionNumber: 'REQ-2026-001',
        title: 'Senior Frontend Engineer',
        departmentId: deptMap.get('ENG')!,
        designationId: desgMap.get('Senior Software Engineer')!,
        hiringManagerId: saraId4,
        createdByEmployeeId: saraId4,
        employmentType: 'FULL_TIME',
        numberOfOpenings: 2,
        positionsFilled: 0,
        location: 'Remote / Karachi',
        minSalary: 200000,
        maxSalary: 350000,
        description: 'We are looking for a Senior Frontend Engineer to join our growing engineering team.',
        requirements: '5+ years React experience, TypeScript proficiency, strong UI/UX sensibility.',
        status: 'OPEN',
        submittedAt: dR(-15),
        approvedByEmployeeId: bilalId4,
        approvedAt: dR(-14),
        targetStartDate: dR(30),
      },
    });

    const req2 = await prisma.jobRequisition.upsert({
      where: { organizationId_requisitionNumber: { organizationId: org.id, requisitionNumber: 'REQ-2026-002' } },
      update: {},
      create: {
        organizationId: org.id,
        requisitionNumber: 'REQ-2026-002',
        title: 'Product Designer',
        departmentId: deptMap.get('PROD')!,
        designationId: desgMap.get('Product Manager')!,
        hiringManagerId: fatimaId4,
        createdByEmployeeId: fatimaId4,
        employmentType: 'FULL_TIME',
        numberOfOpenings: 1,
        positionsFilled: 0,
        status: 'PENDING_APPROVAL',
        submittedAt: dR(-2),
      },
    });

    await prisma.jobRequisition.upsert({
      where: { organizationId_requisitionNumber: { organizationId: org.id, requisitionNumber: 'REQ-2026-003' } },
      update: {},
      create: {
        organizationId: org.id,
        requisitionNumber: 'REQ-2026-003',
        title: 'HR Coordinator',
        departmentId: deptMap.get('HR')!,
        designationId: desgMap.get('HR Specialist')!,
        hiringManagerId: bilalId4,
        createdByEmployeeId: bilalId4,
        employmentType: 'FULL_TIME',
        numberOfOpenings: 1,
        positionsFilled: 0,
        status: 'DRAFT',
      },
    });
    console.log('Section F: created 3 job requisitions');

    // Job posting for REQ-2026-001
    const posting = await prisma.jobPosting.upsert({
      where: { organizationId_slug: { organizationId: org.id, slug: 'senior-frontend-engineer-2026' } },
      update: {},
      create: {
        organizationId: org.id,
        jobRequisitionId: req1.id,
        title: 'Senior Frontend Engineer',
        slug: 'senior-frontend-engineer-2026',
        channel: 'CAREERS_PAGE',
        description: 'Join our engineering team as a Senior Frontend Engineer. Build world-class user interfaces.',
        isInternal: false,
        status: 'PUBLISHED',
        publishedAt: dR(-13),
      },
    });

    // Application stages
    const stageDefs = [
      { sortOrder: 1, name: 'Applied', slug: 'applied', isTerminal: false, isHired: false, isRejected: false },
      { sortOrder: 2, name: 'Phone Screen', slug: 'phone-screen', isTerminal: false, isHired: false, isRejected: false },
      { sortOrder: 3, name: 'Technical', slug: 'technical', isTerminal: false, isHired: false, isRejected: false },
      { sortOrder: 4, name: 'Offer', slug: 'offer', isTerminal: false, isHired: false, isRejected: false },
      { sortOrder: 5, name: 'Hired', slug: 'hired', isTerminal: true, isHired: true, isRejected: false },
    ];
    const stageMap = new Map<string, string>(); // slug → id
    for (const s of stageDefs) {
      const stage = await prisma.applicationStage.upsert({
        where: { jobPostingId_slug: { jobPostingId: posting.id, slug: s.slug } },
        update: {},
        create: {
          organizationId: org.id,
          jobPostingId: posting.id,
          name: s.name,
          slug: s.slug,
          sortOrder: s.sortOrder,
          isTerminal: s.isTerminal,
          isHired: s.isHired,
          isRejected: s.isRejected,
        },
      });
      stageMap.set(s.slug, stage.id);
    }
    console.log('Section F: created 1 job posting with 5 application stages');

    // Candidates
    const candidateDefs = [
      { firstName: 'Tariq', lastName: 'Mehmood', email: 'tariq.mehmood@example.com', phone: '+92-300-1234567', currentCompany: 'TechCo', currentTitle: 'Senior Engineer', totalExperience: 7, source: 'LINKEDIN' as const, location: 'Karachi' },
      { firstName: 'Sana', lastName: 'Riaz', email: 'sana.riaz@example.com', phone: '+92-321-7654321', currentCompany: 'WebStudio', currentTitle: 'FE Engineer', totalExperience: 5, source: 'REFERRAL' as const, referrerEmployeeId: ayeshaId4 },
      { firstName: 'Adeel', lastName: 'Khan', email: 'adeel.khan@example.com', phone: '+92-333-1112233', currentCompany: 'StartupX', currentTitle: 'Frontend Lead', totalExperience: 8, source: 'CAREERS_PAGE' as const },
      { firstName: 'Hira', lastName: 'Iqbal', email: 'hira.iqbal@example.com', phone: '+92-345-9988776', currentCompany: null, currentTitle: 'Junior Dev', totalExperience: 1, source: 'CAREERS_PAGE' as const },
      { firstName: 'Faisal', lastName: 'Akram', email: 'faisal.akram@example.com', phone: '+92-300-5556677', currentCompany: 'GlobalCo', currentTitle: 'FE Engineer', totalExperience: 4, source: 'AGENCY' as const },
    ];
    const candidateMap = new Map<string, string>(); // email → id
    for (const c of candidateDefs) {
      const candidate = await prisma.candidate.upsert({
        where: { organizationId_email: { organizationId: org.id, email: c.email } },
        update: {},
        create: {
          organizationId: org.id,
          firstName: c.firstName,
          lastName: c.lastName,
          email: c.email,
          phone: c.phone,
          currentCompany: c.currentCompany ?? undefined,
          currentTitle: c.currentTitle,
          totalExperience: c.totalExperience,
          source: c.source,
          referrerEmployeeId: 'referrerEmployeeId' in c ? c.referrerEmployeeId : undefined,
          location: 'location' in c ? c.location : undefined,
        },
      });
      candidateMap.set(c.email, candidate.id);
    }
    console.log('Section F: created 5 candidates');

    // Job applications
    const appDefs = [
      { email: 'tariq.mehmood@example.com', status: 'IN_PROGRESS' as const, stageSlug: 'phone-screen', appliedAt: dR(-10) },
      { email: 'sana.riaz@example.com', status: 'IN_PROGRESS' as const, stageSlug: 'technical', appliedAt: dR(-12) },
      { email: 'adeel.khan@example.com', status: 'OFFER_EXTENDED' as const, stageSlug: 'offer', appliedAt: dR(-15) },
      { email: 'hira.iqbal@example.com', status: 'APPLIED' as const, stageSlug: 'applied', appliedAt: dR(-3) },
      { email: 'faisal.akram@example.com', status: 'REJECTED' as const, stageSlug: 'applied', appliedAt: dR(-7), rejectedAt: dR(-5), rejectionReason: 'NOT_QUALIFIED' as const, rejectedByEmployeeId: saraId4 },
    ];
    const appMap = new Map<string, string>(); // candidate email → application id
    for (const a of appDefs) {
      const candidateId = candidateMap.get(a.email)!;
      const app = await prisma.jobApplication.upsert({
        where: { candidateId_jobRequisitionId: { candidateId, jobRequisitionId: req1.id } },
        update: {},
        create: {
          organizationId: org.id,
          candidateId,
          jobRequisitionId: req1.id,
          jobPostingId: posting.id,
          currentStageId: stageMap.get(a.stageSlug)!,
          status: a.status,
          source: candidateDefs.find((c) => c.email === a.email)!.source,
          appliedAt: a.appliedAt,
          rejectionReason: 'rejectionReason' in a ? a.rejectionReason : undefined,
          rejectedAt: 'rejectedAt' in a ? a.rejectedAt : undefined,
          rejectedByEmployeeId: 'rejectedByEmployeeId' in a ? a.rejectedByEmployeeId : undefined,
        },
      });
      appMap.set(a.email, app.id);
    }
    console.log('Section F: created 5 job applications');

    // Interviews
    const tariqAppId = appMap.get('tariq.mehmood@example.com')!;
    const sanaAppId = appMap.get('sana.riaz@example.com')!;
    const adeelAppId = appMap.get('adeel.khan@example.com')!;

    const nowMs3 = Date.now();
    const dI = (offsetDays: number, hour: number) => {
      const base = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z').getTime();
      return new Date(base + offsetDays * 86400000 + hour * 3600000);
    };

    // Interview 1: Tariq — PHONE_SCREEN, SCHEDULED
    const interview1 = await prisma.interview.create({
      data: {
        organizationId: org.id,
        applicationId: tariqAppId,
        stageId: stageMap.get('phone-screen')!,
        scheduledAt: dI(1, 10),
        durationMinutes: 30,
        type: 'PHONE_SCREEN',
        mode: 'VIDEO',
        status: 'SCHEDULED',
        scheduledByEmployeeId: saraId4,
        meetingUrl: 'https://meet.example.com/tariq-phone',
      },
    });
    await prisma.interviewPanelist.create({
      data: { interviewId: interview1.id, employeeId: saraId4, isPrimary: true },
    });

    // Interview 2: Sana — TECHNICAL, SCHEDULED
    const interview2 = await prisma.interview.create({
      data: {
        organizationId: org.id,
        applicationId: sanaAppId,
        stageId: stageMap.get('technical')!,
        scheduledAt: dI(2, 14),
        durationMinutes: 60,
        type: 'TECHNICAL',
        mode: 'VIDEO',
        status: 'SCHEDULED',
        scheduledByEmployeeId: saraId4,
      },
    });
    await prisma.interviewPanelist.create({
      data: { interviewId: interview2.id, employeeId: saraId4, isPrimary: true },
    });

    // Interview 3: Adeel — HIRING_MANAGER, COMPLETED
    const interview3 = await prisma.interview.create({
      data: {
        organizationId: org.id,
        applicationId: adeelAppId,
        stageId: stageMap.get('offer')!,
        scheduledAt: dI(-5, 11),
        durationMinutes: 45,
        type: 'HIRING_MANAGER',
        mode: 'VIDEO',
        status: 'COMPLETED',
        scheduledByEmployeeId: saraId4,
      },
    });
    await prisma.interviewPanelist.create({
      data: { interviewId: interview3.id, employeeId: saraId4, isPrimary: true },
    });
    // Feedback for Adeel's completed interview
    await prisma.interviewFeedback.create({
      data: {
        interviewId: interview3.id,
        panelistEmployeeId: saraId4,
        rating: 4,
        recommendation: 'HIRE',
        strengths: 'Strong React + TypeScript',
        weaknesses: null,
        comments: 'Good cultural fit',
      },
    });
    console.log('Section F: created 3 interviews with panelists (and 1 feedback)');

    // Offer for Adeel
    await prisma.offer.upsert({
      where: { organizationId_offerNumber: { organizationId: org.id, offerNumber: 'OFR-2026-001' } },
      update: {},
      create: {
        organizationId: org.id,
        applicationId: adeelAppId,
        offerNumber: 'OFR-2026-001',
        employmentType: 'FULL_TIME',
        designationId: desgMap.get('Senior Software Engineer')!,
        departmentId: deptMap.get('ENG')!,
        reportingManagerId: saraId4,
        baseSalary: 280000,
        joiningBonus: 50000,
        currency: 'PKR',
        proposedJoiningDate: dR(45),
        expiresAt: dR(10),
        status: 'EXTENDED',
        extendedAt: dR(-3),
        extendedByEmployeeId: saraId4,
      },
    });
    console.log('Section F: created 1 offer for Adeel');
  } else {
    console.log(`Section F: ${reqsExist} job requisitions already exist, skipped`);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Section G: Onboarding instance for Hamza
  // ─────────────────────────────────────────────────────────────────────────────

  const hamzaEmpId = empById.get('EMP004')!;
  const existingOnboarding = await prisma.onboardingInstance.findUnique({
    where: { employeeId: hamzaEmpId },
  });

  if (!existingOnboarding) {
    const template = await prisma.onboardingTemplate.findFirst({
      where: { organizationId: org.id, name: 'Standard Onboarding' },
      include: { tasks: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!template) throw new Error('Onboarding template not found');

    const hamzaJoiningDate = new Date('2025-09-01');
    const nowMs4 = Date.now();
    const todayMs2 = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z').getTime();
    const joinMs = hamzaJoiningDate.getTime();

    const instance = await prisma.onboardingInstance.create({
      data: {
        organizationId: org.id,
        employeeId: hamzaEmpId,
        templateId: template.id,
        templateName: 'Standard Onboarding',
        joiningDate: hamzaJoiningDate,
        status: 'IN_PROGRESS',
        startedAt: hamzaJoiningDate,
        createdByUserId: superAdmin.id,
      },
    });

    // Determine assignee IDs per role
    const aliEmpId = empById.get('EMP002')!; // Hamza's manager
    const bilalEmpId = empById.get('EMP006')!; // HR + IT

    // User IDs for completedByUserId
    const hamzaUserId = empUserIdByCode.get('EMP004')!;
    const aliUserId = empUserIdByCode.get('EMP002')!;
    const bilalUserId = empUserIdByCode.get('EMP006')!;

    for (const templateTask of template.tasks) {
      const dueDate = new Date(joinMs + templateTask.offsetDays * 86400000);

      // Determine assignee
      let assigneeEmployeeId: string | null = null;
      let assigneeUserId: string | null = null;
      if (templateTask.assigneeRole === 'NEW_HIRE') {
        assigneeEmployeeId = hamzaEmpId;
        assigneeUserId = hamzaUserId;
      } else if (templateTask.assigneeRole === 'MANAGER') {
        assigneeEmployeeId = aliEmpId;
        assigneeUserId = aliUserId;
      } else if (templateTask.assigneeRole === 'HR') {
        assigneeEmployeeId = bilalEmpId;
        assigneeUserId = bilalUserId;
      } else if (templateTask.assigneeRole === 'IT') {
        assigneeEmployeeId = bilalEmpId;
        assigneeUserId = bilalUserId;
      }

      // Determine task status
      let taskStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' = 'NOT_STARTED';
      let startedAt: Date | null = null;
      let completedAt: Date | null = null;
      let completedByUserId: string | null = null;

      if (templateTask.sortOrder <= 2) {
        taskStatus = 'COMPLETED';
        startedAt = dueDate;
        completedAt = dueDate;
        completedByUserId = assigneeUserId;
      } else if (templateTask.sortOrder === 3 || templateTask.sortOrder === 4) {
        taskStatus = 'IN_PROGRESS';
        startedAt = new Date(todayMs2 - 15 * 86400000);
      }

      await prisma.onboardingTask.create({
        data: {
          onboardingInstanceId: instance.id,
          templateTaskId: templateTask.id,
          title: templateTask.title,
          description: templateTask.description,
          assigneeRole: templateTask.assigneeRole,
          assigneeEmployeeId,
          sortOrder: templateTask.sortOrder,
          isRequired: templateTask.isRequired,
          allowDocument: templateTask.allowDocument,
          dueDate,
          status: taskStatus,
          startedAt,
          completedAt,
          completedByUserId,
        },
      });
    }
    console.log(`Section G: created onboarding instance for Hamza with ${template.tasks.length} tasks`);
  } else {
    console.log('Section G: onboarding instance for Hamza already exists, skipped');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Section H: Salary structures for all employees
  // ─────────────────────────────────────────────────────────────────────────────

  const salaryComponents = await prisma.salaryComponent.findMany({
    where: { organizationId: org.id },
  });
  const salaryCompMap = new Map(salaryComponents.map((sc) => [sc.code, sc]));

  const grossByCode: Record<string, number> = {
    EMP001: 400000,
    EMP002: 280000,
    EMP003: 200000,
    EMP004: 120000,
    EMP005: 350000,
    EMP006: 350000,
    EMP007: 180000,
    EMP008: 200000,
  };

  let salaryStructureCount = 0;
  for (const [code, gross] of Object.entries(grossByCode)) {
    const employeeId = empById.get(code)!;
    const effectiveFrom = joiningDates[code];

    const existing = await prisma.employeeSalaryStructure.findFirst({
      where: { employeeId, isActive: true },
    });
    if (existing) continue;

    const pf = Math.round(gross * 0.08);
    const tax = Math.round(gross * 0.12);
    const totalDeductions = pf + tax;
    const netSalary = gross - totalDeductions;

    const structure = await prisma.employeeSalaryStructure.create({
      data: {
        organizationId: org.id,
        employeeId,
        effectiveFrom,
        grossSalary: gross,
        totalDeductions,
        netSalary,
        isActive: true,
      },
    });
    salaryStructureCount++;

    const componentAmounts: Record<string, number> = {
      BASIC: Math.round(gross * 0.5),
      HRA: Math.round(gross * 0.25),
      CONV: Math.round(gross * 0.1),
      MED: Math.round(gross * 0.15),
      PF: pf,
      TAX: tax,
    };

    for (const [componentCode, amount] of Object.entries(componentAmounts)) {
      const salaryComponent = salaryCompMap.get(componentCode);
      if (!salaryComponent) continue;
      await prisma.employeeSalaryComponent.upsert({
        where: { employeeSalaryStructureId_salaryComponentId: { employeeSalaryStructureId: structure.id, salaryComponentId: salaryComponent.id } },
        update: {},
        create: {
          employeeSalaryStructureId: structure.id,
          salaryComponentId: salaryComponent.id,
          amount,
        },
      });
    }
  }
  console.log(`Section H: created ${salaryStructureCount} salary structures (6 components each)`);

  // ─────────────────────────────────────────────────────────────────────────────
  // Section I: Last month's payroll cycle (FINALIZED) + payslips for all employees
  // ─────────────────────────────────────────────────────────────────────────────

  const today = new Date();
  const lastMonthAnchor = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1),
  );
  const cycleYear = lastMonthAnchor.getUTCFullYear();
  const cycleMonth = lastMonthAnchor.getUTCMonth() + 1; // 1..12
  const periodStart = new Date(Date.UTC(cycleYear, cycleMonth - 1, 1));
  const periodEnd = new Date(Date.UTC(cycleYear, cycleMonth, 0)); // last day of month

  const existingCycle = await prisma.payrollCycle.findUnique({
    where: {
      organizationId_year_month: {
        organizationId: org.id,
        year: cycleYear,
        month: cycleMonth,
      },
    },
  });

  if (!existingCycle) {
    const finalizerEmployeeId = empById.get('EMP006')!; // Bilal — HR Manager
    const cycle = await prisma.payrollCycle.create({
      data: {
        organizationId: org.id,
        year: cycleYear,
        month: cycleMonth,
        periodStart,
        periodEnd,
        status: 'DRAFT',
      },
    });

    let totalGross = 0;
    let totalDed = 0;
    let totalNet = 0;
    let payrollCount = 0;

    for (const code of Object.keys(grossByCode)) {
      const employeeId = empById.get(code);
      if (!employeeId) continue;
      const gross = grossByCode[code];

      const structure = await prisma.employeeSalaryStructure.findFirst({
        where: { employeeId, isActive: true },
        include: { components: { include: { salaryComponent: true } } },
      });
      if (!structure) continue;

      let grossEarnings = 0;
      let deductions = 0;
      for (const c of structure.components) {
        const amt = Number(c.amount);
        if (c.salaryComponent.type === 'EARNING') grossEarnings += amt;
        else deductions += amt;
      }
      const netPayable = grossEarnings - deductions;

      const payroll = await prisma.payroll.create({
        data: {
          organizationId: org.id,
          payrollCycleId: cycle.id,
          employeeId,
          totalWorkingDays: 22,
          paidLeaveDays: 0,
          unpaidLeaveDays: 0,
          halfDays: 0,
          holidayDays: 0,
          effectiveWorkingDays: 22,
          baseSalary: gross,
          grossEarnings,
          totalDeductions: deductions,
          totalAdjustments: 0,
          lossOfPayDeduction: 0,
          netPayable,
        },
      });

      for (const c of structure.components) {
        await prisma.payrollLineItem.create({
          data: {
            payrollId: payroll.id,
            salaryComponentId: c.salaryComponent.id,
            componentName: c.salaryComponent.name,
            componentCode: c.salaryComponent.code,
            type: c.salaryComponent.type,
            amount: Number(c.amount),
            sortOrder: c.salaryComponent.sortOrder,
          },
        });
      }

      totalGross += grossEarnings;
      totalDed += deductions;
      totalNet += netPayable;
      payrollCount++;
    }

    await prisma.payrollCycle.update({
      where: { id: cycle.id },
      data: {
        status: 'FINALIZED',
        totalGross,
        totalDeductions: totalDed,
        totalNet,
        employeeCount: payrollCount,
        generatedAt: new Date(),
        finalizedAt: new Date(),
        finalizedById: finalizerEmployeeId,
      },
    });

    console.log(
      `Section I: created FINALIZED payroll cycle ${cycleYear}-${String(cycleMonth).padStart(2, '0')} with ${payrollCount} payslips (net total: ${totalNet})`,
    );
  } else {
    console.log(
      `Section I: payroll cycle ${cycleYear}-${String(cycleMonth).padStart(2, '0')} already exists, skipped`,
    );
  }

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
