import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../../users/services/users.service';
import { OrganizationsService } from '../../organizations/services/organizations.service';
import { TokenService } from './token.service';
import { LoginDto } from '../dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly organizationsService: OrganizationsService,
    private readonly tokenService: TokenService,
  ) {}

  /**
   * Validate credentials and return tokens + user profile.
   * Tenant-aware: resolves org from slug before user lookup.
   */
  async login(dto: LoginDto) {
    // 1. Resolve organization by slug
    const org = await this.organizationsService.findBySlug(dto.organizationSlug);
    if (!org || !org.isActive) {
      throw new UnauthorizedException('Invalid organization');
    }

    // 2. Find user scoped to the resolved organization
    const user = await this.usersService.findByOrgAndEmail(org.id, dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // 3. Verify password
    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // 4. Load full profile with roles/permissions
    const profile = await this.usersService.findByIdWithPermissions(user.id);
    if (!profile) {
      throw new UnauthorizedException('User account is not active');
    }

    // 5. Generate tokens
    const accessToken = this.tokenService.generateAccessToken(user.id, user.organizationId);
    const refreshToken = await this.tokenService.generateRefreshToken(user.id);

    // 6. Update last login
    await this.usersService.updateLastLogin(user.id);

    return {
      accessToken,
      refreshToken,
      user: {
        id: profile.userId,
        email: profile.email,
        firstName: profile.firstName,
        lastName: profile.lastName,
        organizationId: profile.organizationId,
        roles: profile.roles,
        permissions: profile.permissions,
      },
    };
  }

  /**
   * Rotate refresh token: validate old, revoke it, issue new pair.
   */
  async refresh(userId: string, tokenId: string, rawToken: string) {
    const record = await this.tokenService.validateRefreshToken(tokenId, rawToken);
    if (!record) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Revoke the old refresh token
    await this.tokenService.revokeRefreshToken(tokenId);

    // Load user profile
    const profile = await this.usersService.findByIdWithPermissions(userId);
    if (!profile) {
      throw new UnauthorizedException('User account is not active');
    }

    // Issue new pair
    const accessToken = this.tokenService.generateAccessToken(
      profile.userId,
      profile.organizationId,
    );
    const refreshToken = await this.tokenService.generateRefreshToken(profile.userId);

    return {
      accessToken,
      refreshToken,
      user: {
        id: profile.userId,
        email: profile.email,
        firstName: profile.firstName,
        lastName: profile.lastName,
        organizationId: profile.organizationId,
        roles: profile.roles,
        permissions: profile.permissions,
      },
    };
  }

  /**
   * Verify the refresh token JWT, then revoke it.
   * Validates ownership at both JWT-payload level AND DB-record level.
   */
  async logout(refreshToken: string, userId: string): Promise<void> {
    const decoded = this.tokenService.verifyRefreshToken(refreshToken);
    if (!decoded) return;

    // Fast-path: JWT payload must match the authenticated caller
    if (decoded.userId !== userId) return;

    // DB-level ownership check + revocation in one atomic operation
    await this.tokenService.revokeOwnedRefreshToken(decoded.tokenId, userId);
  }
}
