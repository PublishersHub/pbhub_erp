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
  { code: 'payroll.read_sensitive', name: 'View Sensitive Payroll Data', module: 'payroll' },
  { code: 'payroll.run', name: 'Run Payroll', module: 'payroll' },
  { code: 'payroll.approve', name: 'Approve Payroll', module: 'payroll' },

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
    'policy.read', 'policy.create', 'policy.publish', 'policy.manage',
    'report.read', 'report.manage',
    'audit.read',
    'settings.read', 'settings.manage',
  ],

  manager: [
    'employee.read',
    'attendance.read',
    'leave.read', 'leave.approve',
    'performance.read', 'performance.create_goals', 'performance.approve_goals', 'performance.review',
    'report.read',
    'policy.read',
    'role.read',
  ],

  employee: [
    'attendance.checkin', 'attendance.read_own',
    'leave.request', 'leave.read_own',
    'performance.read_own', 'performance.create_goals',
    'loan.request', 'loan.read_own',
    'policy.read', 'policy.acknowledge',
  ],

  finance_admin: [
    'employee.read', 'employee.read_sensitive',
    'attendance.read',
    'payroll.read', 'payroll.read_sensitive', 'payroll.run', 'payroll.approve',
    'loan.read', 'loan.manage', 'loan.approve',
    'report.read',
    'audit.read',
    'role.read',
  ],
};

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

  // 5. Super Admin user
  const passwordHash = await bcrypt.hash('admin123', 12);

  const superAdmin = await prisma.user.upsert({
    where: { organizationId_email: { organizationId: org.id, email: 'admin@pbhub.com' } },
    update: {},
    create: {
      organizationId: org.id,
      email: 'admin@pbhub.com',
      passwordHash,
      firstName: 'Super',
      lastName: 'Admin',
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
  console.log(`Super Admin: ${superAdmin.email} (password: admin123)`);

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
