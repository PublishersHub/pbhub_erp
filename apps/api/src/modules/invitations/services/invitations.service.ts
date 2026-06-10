import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { MailerService } from '../../../common/mail/mail.service';
import { TokenService } from '../../auth/services/token.service';
import { UsersService } from '../../users/services/users.service';
import { CreateInvitationDto } from '../dto/create-invitation.dto';
import { AcceptInvitationDto } from '../dto/accept-invitation.dto';
import { renderBrandedHtml } from '../../../common/mail/templates/branded-html';

@Injectable()
export class InvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: MailerService,
    private readonly config: ConfigService,
    private readonly tokenService: TokenService,
    private readonly usersService: UsersService,
  ) {}

  // ─── Create ──────────────────────────────────────────────────────────────────

  async createInvitation(
    organizationId: string,
    invitedByUserId: string,
    dto: CreateInvitationDto,
  ) {
    const email = dto.email.toLowerCase().trim();

    // 1. Reject if email already has an active membership in this org
    const existingAccount = await this.prisma.account.findUnique({
      where: { email },
      include: {
        users: {
          where: { organizationId, isActive: true },
        },
      },
    });
    if (existingAccount && existingAccount.users.length > 0) {
      throw new ConflictException(
        'This email already has an active membership in this organization',
      );
    }

    // 2. Reject if a PENDING invitation already exists for this email in this org
    const pendingInvitation = await this.prisma.invitation.findFirst({
      where: { organizationId, email, status: 'PENDING' },
    });
    if (pendingInvitation) {
      throw new ConflictException(
        'A pending invitation already exists for this email in this organization',
      );
    }

    // 3a. Validate optional employeeId belongs to this org and isn't already linked
    if (dto.employeeId) {
      const employee = await this.prisma.employee.findFirst({
        where: { id: dto.employeeId, organizationId },
        select: { id: true, userId: true, isActive: true },
      });
      if (!employee) {
        throw new BadRequestException('Employee not found in this organization');
      }
      if (employee.userId) {
        throw new ConflictException(
          'This employee is already linked to a user account',
        );
      }
    }

    // 3. Validate every roleId
    if (dto.roleIds.length > 0) {
      const roles = await this.prisma.role.findMany({
        where: {
          id: { in: dto.roleIds },
          isActive: true,
          OR: [{ organizationId }, { organizationId: null, isSystem: true }],
        },
      });
      if (roles.length !== dto.roleIds.length) {
        const foundIds = new Set(roles.map((r) => r.id));
        const invalid = dto.roleIds.filter((id) => !foundIds.has(id));
        throw new BadRequestException(
          `Invalid or inaccessible role IDs: ${invalid.join(', ')}`,
        );
      }
    }

    // 4. Generate token and hash it
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // 5. Create invitation + role assignments in a transaction
    const invitation = await this.prisma.$transaction(async (tx) => {
      const inv = await tx.invitation.create({
        data: {
          organizationId,
          email,
          firstName: dto.firstName,
          lastName: dto.lastName,
          tokenHash,
          expiresAt,
          status: 'PENDING',
          invitedByUserId,
          employeeId: dto.employeeId ?? null,
          roleAssignments: {
            create: dto.roleIds.map((roleId) => ({ roleId })),
          },
        },
        include: {
          organization: {
            select: {
              name: true,
              brandName: true,
              brandLogoUrl: true,
              brandPrimary: true,
              brandTagline: true,
            },
          },
          invitedByUser: {
            include: {
              account: { select: { firstName: true, lastName: true, email: true } },
            },
          },
          roleAssignments: {
            include: { role: { select: { id: true, name: true, slug: true } } },
          },
        },
      });
      return inv;
    });

    // 6. Send invitation email (fire-and-forget)
    const appBaseUrl = this.config.get<string>('app.appBaseUrl', 'http://localhost:3000');
    const inviteLink = `${appBaseUrl}/accept-invitation?token=${rawToken}`;

    const org = invitation.organization;
    const displayName = org.brandName ?? org.name;
    const branding = {
      brandName: org.brandName,
      brandLogoUrl: org.brandLogoUrl,
      brandPrimary: org.brandPrimary,
      brandTagline: org.brandTagline,
    };

    await this.mailer.send({
      to: email,
      subject: `You've been invited to join ${displayName}`,
      body: `You've been invited to join ${displayName}.\n\nClick to accept: ${inviteLink}\n\nThis invitation expires in 7 days.`,
      html: renderBrandedHtml({
        branding,
        preheader: `Accept your invitation to ${displayName}`,
        heading: `You've been invited to join ${displayName}`,
        intro: `Hi ${invitation.firstName}, ${displayName} has invited you to join their HR portal. Click below to set your password and start using the system.`,
        ctaLabel: 'Accept invitation',
        ctaUrl: inviteLink,
        footerNote: `This invitation expires in 7 days. If you didn't expect this email, you can safely ignore it.`,
      }),
    });

    // Return invitation without tokenHash + the raw token for dev convenience
    const { tokenHash: _omit, ...invitationData } = invitation as any;
    return {
      ...invitationData,
      rawToken,
      inviteLink,
    };
  }

  // ─── List ─────────────────────────────────────────────────────────────────────

  async listInvitations(organizationId: string, status?: string) {
    const where: any = { organizationId };
    if (status) {
      where.status = status;
    }

    return this.prisma.invitation.findMany({
      where,
      include: {
        invitedByUser: {
          include: {
            account: { select: { firstName: true, lastName: true, email: true } },
          },
        },
        roleAssignments: {
          include: { role: { select: { id: true, name: true, slug: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Revoke ───────────────────────────────────────────────────────────────────

  async revokeInvitation(organizationId: string, invitationId: string) {
    const invitation = await this.prisma.invitation.findFirst({
      where: { id: invitationId, organizationId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== 'PENDING') {
      throw new BadRequestException(
        `Cannot revoke an invitation with status: ${invitation.status}`,
      );
    }

    return this.prisma.invitation.update({
      where: { id: invitationId },
      data: { status: 'REVOKED' },
    });
  }

  // ─── By Token (public) ────────────────────────────────────────────────────────

  async getInvitationByToken(rawToken: string) {
    const tokenHash = this.hashToken(rawToken);

    const invitation = await this.prisma.invitation.findUnique({
      where: { tokenHash },
      include: {
        organization: {
          select: {
            name: true,
            slug: true,
            brandName: true,
            brandLogoUrl: true,
            brandPrimary: true,
            brandTagline: true,
            brandFaviconUrl: true,
            brandLoginBg: true,
          },
        },
      },
    });

    if (
      !invitation ||
      invitation.status !== 'PENDING' ||
      invitation.expiresAt < new Date()
    ) {
      throw new NotFoundException('Invalid or expired invitation');
    }

    return {
      email: invitation.email,
      firstName: invitation.firstName,
      lastName: invitation.lastName,
      organizationName: invitation.organization.name,
      organizationSlug: invitation.organization.slug,
      organizationBrandName: invitation.organization.brandName,
      organizationBrandLogoUrl: invitation.organization.brandLogoUrl,
      organizationBrandPrimary: invitation.organization.brandPrimary,
      organizationBrandTagline: invitation.organization.brandTagline,
      organizationBrandFaviconUrl: invitation.organization.brandFaviconUrl,
      organizationBrandLoginBg: invitation.organization.brandLoginBg,
      expiresAt: invitation.expiresAt,
    };
  }

  // ─── Accept (public) ──────────────────────────────────────────────────────────

  async acceptInvitation(dto: AcceptInvitationDto) {
    const tokenHash = this.hashToken(dto.token);

    const invitation = await this.prisma.invitation.findUnique({
      where: { tokenHash },
      include: {
        roleAssignments: { select: { roleId: true } },
        employee: { select: { id: true, userId: true, organizationId: true } },
      },
    });

    if (
      !invitation ||
      invitation.status !== 'PENDING' ||
      invitation.expiresAt < new Date()
    ) {
      throw new NotFoundException('Invalid or expired invitation');
    }

    const email = invitation.email;

    return this.prisma.$transaction(async (tx) => {
      // Check if an Account already exists for this email
      let account = await tx.account.findUnique({ where: { email } });
      let isNewAccount = false;

      if (!account) {
        // New human — create Account with hashed password
        const firstName = dto.firstName ?? invitation.firstName;
        const lastName = dto.lastName ?? invitation.lastName;
        const passwordHash = await bcrypt.hash(dto.password, 12);

        account = await tx.account.create({
          data: {
            email,
            passwordHash,
            firstName,
            lastName,
            isActive: true,
          },
        });
        isNewAccount = true;
      }

      // Create the User membership row
      const user = await tx.user.create({
        data: {
          accountId: account.id,
          organizationId: invitation.organizationId,
          isActive: true,
        },
      });

      // Create UserRole rows for each InvitationRoleAssignment
      if (invitation.roleAssignments.length > 0) {
        await tx.userRole.createMany({
          data: invitation.roleAssignments.map(({ roleId }) => ({
            userId: user.id,
            roleId,
            organizationId: invitation.organizationId,
          })),
          skipDuplicates: true,
        });
      }

      // Link the new User to the pre-assigned Employee (if any and still unlinked)
      if (
        invitation.employee &&
        invitation.employee.organizationId === invitation.organizationId &&
        !invitation.employee.userId
      ) {
        await tx.employee.update({
          where: { id: invitation.employee.id },
          data: { userId: user.id },
        });
      }

      // Mark invitation as ACCEPTED
      await tx.invitation.update({
        where: { id: invitation.id },
        data: {
          status: 'ACCEPTED',
          acceptedAt: new Date(),
          acceptedAccountId: account.id,
        },
      });

      return { account, user, isNewAccount };
    }).then(async ({ account, isNewAccount }) => {
      // Issue tokens outside the transaction (generates refresh token in DB)
      const accountId = account.id;

      // Count active memberships AFTER the new one was created
      const memberships = await this.usersService.findActiveMembershipsForAccount(accountId);

      const accountProfile = {
        id: account.id,
        email: account.email,
        firstName: account.firstName,
        lastName: account.lastName,
      };

      const refreshToken = await this.tokenService.generateRefreshToken(accountId);

      // If this account has exactly 1 membership (just created, or was fresh), auto-issue access token
      // If existing account with prior memberships, return multi-membership shape
      const priorMembershipCount = isNewAccount ? 0 : memberships.length - 1;

      if (priorMembershipCount >= 1) {
        // Existing multi-org account — return refresh + memberships (no access token)
        return {
          refreshToken,
          account: accountProfile,
          memberships,
        };
      }

      // Single membership (new hire) — mint access token for this org
      const targetMembership = memberships.find(
        (m) => m.organizationId === invitation.organizationId,
      );
      if (!targetMembership) {
        throw new NotFoundException('Membership not found after acceptance');
      }

      const userId = targetMembership.userId;
      const accessToken = this.tokenService.generateAccessToken(
        accountId,
        userId,
        invitation.organizationId,
      );

      return {
        accessToken,
        refreshToken,
        account: accountProfile,
        memberships,
        activeOrganizationId: invitation.organizationId,
        user: {
          id: userId,
          organizationId: invitation.organizationId,
          roles: targetMembership.roles,
          permissions: [],
        },
      };
    });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
