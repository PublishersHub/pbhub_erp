import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../../users/services/users.service';
import { TokenService } from './token.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { LoginDto } from '../dto/login.dto';
import { UpdateAccountDto } from '../dto/update-account.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly tokenService: TokenService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Validate (email, password) against Account. Returns account + memberships
   * + tokens. If the account has exactly one active membership the response
   * also includes an org-scoped access token; otherwise the frontend must
   * call /auth/select-organization next.
   */
  async login(dto: LoginDto) {
    const account = await this.usersService.findActiveAccountByEmail(dto.email);
    if (!account) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordValid = await bcrypt.compare(dto.password, account.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const memberships = await this.usersService.findActiveMembershipsForAccount(
      account.id,
    );
    if (memberships.length === 0) {
      throw new ForbiddenException('Account has no active organization access');
    }

    await this.usersService.updateAccountLastLogin(account.id);

    const refreshToken = await this.tokenService.generateRefreshToken(account.id);

    const accountProfile = {
      id: account.id,
      email: account.email,
      firstName: account.firstName,
      lastName: account.lastName,
    };

    if (memberships.length === 1) {
      const m = memberships[0];
      const issued = await this.issueAccessTokenForOrg(account.id, m.organizationId);
      return {
        refreshToken,
        account: accountProfile,
        ...issued,
      };
    }

    return {
      refreshToken,
      account: accountProfile,
      memberships,
    };
  }

  /**
   * Issue an access token for a chosen org using a valid refresh token.
   * Used right after login when the account has 2+ memberships.
   */
  async selectOrganization(
    accountId: string,
    tokenId: string,
    rawRefreshToken: string,
    organizationId: string,
  ) {
    const record = await this.tokenService.validateRefreshToken(
      tokenId,
      rawRefreshToken,
    );
    if (!record || record.accountId !== accountId) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    return this.issueAccessTokenForOrg(accountId, organizationId);
  }

  /**
   * Mid-session org switch — the caller is already authenticated via the
   * access token (the controller-level guard validates that). We just need
   * to confirm the membership and mint a new access token. Refresh token
   * is unchanged.
   */
  async switchOrganization(accountId: string, organizationId: string) {
    return this.issueAccessTokenForOrg(accountId, organizationId);
  }

  /**
   * Rotate refresh token + mint new access token. Optional `organizationId`
   * lets the client say which org the new access token should be scoped to;
   * defaults to whatever org is implied by the existing membership lookup.
   */
  async refresh(
    accountId: string,
    tokenId: string,
    rawRefreshToken: string,
    organizationId: string | undefined,
  ) {
    const record = await this.tokenService.validateRefreshToken(
      tokenId,
      rawRefreshToken,
    );
    if (!record || record.accountId !== accountId) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (!organizationId) {
      const memberships = await this.usersService.findActiveMembershipsForAccount(
        accountId,
      );
      if (memberships.length === 0) {
        throw new ForbiddenException('Account has no active organization access');
      }
      organizationId = memberships[0].organizationId;
    }

    await this.tokenService.revokeRefreshToken(tokenId);
    const newRefresh = await this.tokenService.generateRefreshToken(accountId);

    const issued = await this.issueAccessTokenForOrg(accountId, organizationId);
    return { ...issued, refreshToken: newRefresh };
  }

  async logout(refreshToken: string, accountId: string): Promise<void> {
    const decoded = this.tokenService.verifyRefreshToken(refreshToken);
    if (!decoded) return;
    if (decoded.accountId !== accountId) return;
    await this.tokenService.revokeOwnedRefreshToken(decoded.tokenId, accountId);
  }

  /**
   * Build the /auth/me payload from the already-resolved authenticated user
   * plus a fresh memberships list for the picker / nav switcher.
   */
  async me(authenticatedUser: {
    accountId: string;
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    organizationId: string;
    roles: string[];
    permissions: string[];
  }) {
    const memberships = await this.usersService.findActiveMembershipsForAccount(
      authenticatedUser.accountId,
    );

    const activeOrganization = authenticatedUser.organizationId
      ? await this.prisma.organization.findUnique({
          where: { id: authenticatedUser.organizationId },
          select: {
            id: true,
            name: true,
            slug: true,
            brandName: true,
            brandLogoUrl: true,
            brandPrimary: true,
            brandTagline: true,
          },
        })
      : null;

    return {
      account: {
        id: authenticatedUser.accountId,
        email: authenticatedUser.email,
        firstName: authenticatedUser.firstName,
        lastName: authenticatedUser.lastName,
      },
      activeOrganizationId: authenticatedUser.organizationId,
      activeOrganization,
      user: {
        id: authenticatedUser.userId,
        organizationId: authenticatedUser.organizationId,
        roles: authenticatedUser.roles,
        permissions: authenticatedUser.permissions,
      },
      memberships,
    };
  }

  async getMyAccount(accountId: string) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        lastLoginAt: true,
        isActive: true,
      },
    });
    if (!account) throw new UnauthorizedException('Account not found');
    return account;
  }

  async updateMyAccount(accountId: string, dto: UpdateAccountDto) {
    if (dto.email) {
      const normalized = dto.email.toLowerCase().trim();
      const existing = await this.prisma.account.findUnique({
        where: { email: normalized },
      });
      if (existing && existing.id !== accountId) {
        throw new ConflictException('An account with that email already exists');
      }
      dto.email = normalized;
    }
    const updated = await this.prisma.account.update({
      where: { id: accountId },
      data: {
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        ...(dto.email !== undefined && { email: dto.email }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        lastLoginAt: true,
        isActive: true,
      },
    });
    return updated;
  }

  async changeMyPassword(accountId: string, dto: ChangePasswordDto) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
    });
    if (!account) throw new UnauthorizedException('Account not found');

    const ok = await bcrypt.compare(dto.currentPassword, account.passwordHash);
    if (!ok) throw new BadRequestException('Current password is incorrect');

    const newHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.account.update({
      where: { id: accountId },
      data: { passwordHash: newHash },
    });

    // Sign out everywhere — revoke all refresh tokens
    await this.tokenService.revokeAllAccountTokens(accountId);
  }

  /**
   * Internal helper — confirms the membership is active in `organizationId`
   * and produces an access token plus the user-scoped fields the response
   * shape needs.
   */
  private async issueAccessTokenForOrg(accountId: string, organizationId: string) {
    const userId = await this.usersService.findActiveMembershipUserId(
      accountId,
      organizationId,
    );
    if (!userId) {
      throw new ForbiddenException(
        'You do not have an active membership in that organization',
      );
    }

    const profile = await this.usersService.findActiveAuthContext(
      accountId,
      userId,
      organizationId,
    );
    if (!profile) {
      throw new ForbiddenException('Membership is no longer active');
    }

    const accessToken = this.tokenService.generateAccessToken(
      accountId,
      userId,
      organizationId,
    );

    const [memberships, activeOrganization] = await Promise.all([
      this.usersService.findActiveMembershipsForAccount(accountId),
      this.prisma.organization.findUnique({
        where: { id: organizationId },
        select: {
          id: true,
          name: true,
          slug: true,
          brandName: true,
          brandLogoUrl: true,
          brandPrimary: true,
          brandTagline: true,
        },
      }),
    ]);

    return {
      accessToken,
      activeOrganizationId: organizationId,
      activeOrganization,
      memberships,
      user: {
        id: profile.userId,
        organizationId: profile.organizationId,
        roles: profile.roles,
        permissions: profile.permissions,
      },
    };
  }
}
