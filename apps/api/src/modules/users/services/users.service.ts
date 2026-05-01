import { Injectable } from '@nestjs/common';
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
}
