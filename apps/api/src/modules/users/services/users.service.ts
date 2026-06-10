import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../common/types';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find an account by email (case-insensitive). Returns null if missing
   * or inactive.
   */
  async findActiveAccountByEmail(email: string) {
    const account = await this.prisma.account.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    if (!account || !account.isActive) return null;
    return account;
  }

  /**
   * List all active memberships for an account, restricted to active orgs.
   * Returns the data the frontend needs to render the picker.
   */
  async findActiveMembershipsForAccount(accountId: string) {
    const memberships = await this.prisma.user.findMany({
      where: {
        accountId,
        isActive: true,
        organization: { isActive: true },
      },
      include: {
        organization: { select: { id: true, name: true, slug: true } },
        userRoles: {
          include: { role: { select: { slug: true, isActive: true } } },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return memberships.map((m) => ({
      userId: m.id,
      organizationId: m.organizationId,
      organizationName: m.organization.name,
      organizationSlug: m.organization.slug,
      roles: m.userRoles
        .filter((ur) => ur.role.isActive)
        .map((ur) => ur.role.slug),
    }));
  }

  /**
   * Verify (account, membership, org) is consistent and active, and return
   * the full AuthenticatedUser context. Called on every authenticated request.
   */
  async findActiveAuthContext(
    accountId: string,
    userId: string,
    organizationId: string,
  ): Promise<AuthenticatedUser | null> {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        accountId,
        organizationId,
        isActive: true,
        account: { isActive: true },
        organization: { isActive: true },
      },
      include: {
        account: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user) return null;

    const activeUserRoles = user.userRoles.filter((ur) => ur.role.isActive);
    const roles = activeUserRoles.map((ur) => ur.role.slug);
    const permissions = [
      ...new Set(
        activeUserRoles.flatMap((ur) =>
          ur.role.rolePermissions.map((rp) => rp.permission.code),
        ),
      ),
    ];

    return {
      accountId: user.account.id,
      userId: user.id,
      email: user.account.email,
      organizationId: user.organizationId,
      firstName: user.account.firstName,
      lastName: user.account.lastName,
      roles,
      permissions,
    };
  }

  /**
   * Confirm an account has an active membership in a specific org.
   * Returns the membership row id, or null.
   */
  async findActiveMembershipUserId(
    accountId: string,
    organizationId: string,
  ): Promise<string | null> {
    const user = await this.prisma.user.findFirst({
      where: {
        accountId,
        organizationId,
        isActive: true,
        account: { isActive: true },
        organization: { isActive: true },
      },
      select: { id: true },
    });
    return user?.id ?? null;
  }

  async updateAccountLastLogin(accountId: string): Promise<void> {
    await this.prisma.account.update({
      where: { id: accountId },
      data: { lastLoginAt: new Date() },
    });
  }

  /**
   * List all memberships (users) in an org with their roles and linked employee record.
   */
  async listMembersWithRoles(organizationId: string) {
    return this.prisma.user.findMany({
      where: { organizationId },
      include: {
        account: { select: { id: true, email: true, firstName: true, lastName: true } },
        employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true } },
        userRoles: {
          include: { role: { select: { id: true, name: true, slug: true, isActive: true } } },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * List active employees in an org that don't yet have a User login. These
   * are surfaced on the members page so HR can see them and invite them to
   * log in without bouncing through /employees.
   */
  async listEmployeesWithoutUser(organizationId: string) {
    return this.prisma.employee.findMany({
      where: { organizationId, isActive: true, userId: null },
      select: {
        id: true,
        employeeCode: true,
        firstName: true,
        lastName: true,
        personalEmail: true,
        department: { select: { id: true, name: true } },
        designation: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Assign a role to a user (membership) in the current org.
   * Idempotent — returns the existing row if the assignment already exists.
   */
  async assignRole(organizationId: string, userId: string, roleId: string) {
    const user = await this.prisma.user.findFirst({ where: { id: userId, organizationId } });
    if (!user) throw new NotFoundException('User not found');

    const role = await this.prisma.role.findFirst({
      where: {
        id: roleId,
        OR: [{ organizationId }, { organizationId: null, isSystem: true }],
        isActive: true,
      },
    });
    if (!role) throw new NotFoundException('Role not found');

    return this.prisma.userRole.upsert({
      where: { userId_roleId_organizationId: { userId, roleId, organizationId } },
      update: {},
      create: { userId, roleId, organizationId },
    });
  }

  /**
   * Remove a role from a user (membership) in the current org.
   */
  async removeRole(organizationId: string, userId: string, roleId: string) {
    await this.prisma.userRole.deleteMany({
      where: { userId, roleId, organizationId },
    });
  }

  /**
   * Admin-set password for a member of the current org. The new password is
   * hashed and saved on the Account row (Accounts authenticate, Users only
   * scope them to orgs). Revokes all existing refresh tokens so the user is
   * forced to re-login with the new credentials.
   */
  async adminSetPassword(
    organizationId: string,
    userId: string,
    newPassword: string,
  ) {
    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    const user = await this.prisma.user.findFirst({
      where: { id: userId, organizationId },
      select: { id: true, accountId: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const hash = await bcrypt.hash(newPassword, 12);

    await this.prisma.$transaction([
      this.prisma.account.update({
        where: { id: user.accountId },
        data: { passwordHash: hash },
      }),
      this.prisma.refreshToken.deleteMany({
        where: { accountId: user.accountId },
      }),
    ]);

    return { ok: true };
  }

  /**
   * Toggle a User membership active flag. When deactivating, also revokes
   * refresh tokens so the user is signed out everywhere immediately.
   */
  async setUserActive(
    organizationId: string,
    userId: string,
    isActive: boolean,
  ) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, organizationId },
      select: { id: true, accountId: true },
    });
    if (!user) throw new NotFoundException('User not found');

    if (isActive) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { isActive: true },
      });
    } else {
      await this.prisma.$transaction([
        this.prisma.user.update({
          where: { id: userId },
          data: { isActive: false },
        }),
        this.prisma.refreshToken.deleteMany({
          where: { accountId: user.accountId },
        }),
      ]);
    }

    return { ok: true, isActive };
  }

  /**
   * Update the display name on the Account. Because Account is shared across
   * orgs, the name change propagates to every membership. We also sync to the
   * linked Employee row within this org if one exists so the directory stays
   * consistent.
   */
  async updateAccountName(
    organizationId: string,
    userId: string,
    firstName: string,
    lastName: string,
  ) {
    if (!firstName?.trim() || !lastName?.trim()) {
      throw new BadRequestException('firstName and lastName are required');
    }

    const user = await this.prisma.user.findFirst({
      where: { id: userId, organizationId },
      select: {
        id: true,
        accountId: true,
        employee: { select: { id: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');

    const fn = firstName.trim();
    const ln = lastName.trim();

    await this.prisma.$transaction(async (tx) => {
      await tx.account.update({
        where: { id: user.accountId },
        data: { firstName: fn, lastName: ln },
      });
      if (user.employee) {
        await tx.employee.update({
          where: { id: user.employee.id },
          data: { firstName: fn, lastName: ln },
        });
      }
    });

    return { ok: true };
  }
}
