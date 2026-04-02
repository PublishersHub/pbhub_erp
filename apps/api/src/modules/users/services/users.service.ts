import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../common/types';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find a user by email within a specific organization.
   * Uses the (organizationId, email) unique composite for exact lookup,
   * then checks isActive in application logic.
   */
  async findByOrgAndEmail(organizationId: string, email: string) {
    const user = await this.prisma.user.findUnique({
      where: { organizationId_email: { organizationId, email } },
    });
    if (!user || !user.isActive) return null;
    return user;
  }

  /**
   * Load a user with all roles and permissions.
   * Called on every authenticated request by the JWT strategy
   * to provide full authorization context.
   */
  async findByIdWithPermissions(userId: string): Promise<AuthenticatedUser | null> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, isActive: true },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) return null;

    // Filter to active roles only, then extract slugs and permissions
    const activeUserRoles = user.userRoles.filter((ur) => ur.role.isActive);

    const roles = activeUserRoles.map((ur) => ur.role.slug);

    // Deduplicate permissions across all assigned roles
    const permissions = [
      ...new Set(
        activeUserRoles.flatMap((ur) => ur.role.rolePermissions.map((rp) => rp.permission.code)),
      ),
    ];

    return {
      userId: user.id,
      email: user.email,
      organizationId: user.organizationId,
      firstName: user.firstName,
      lastName: user.lastName,
      roles,
      permissions,
    };
  }

  /**
   * Update last login timestamp.
   */
  async updateLastLogin(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }
}
