import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Generate a JWT access token (short-lived).
   * Claims: sub=accountId, userId=membership-row id, organizationId.
   */
  generateAccessToken(accountId: string, userId: string, organizationId: string): string {
    return this.jwtService.sign(
      { sub: accountId, userId, organizationId },
      {
        secret: this.configService.get<string>('app.jwt.accessSecret'),
        expiresIn: this.configService.get<string>('app.jwt.accessExpiresIn'),
      },
    );
  }

  /**
   * Generate an account-scoped refresh token.
   */
  async generateRefreshToken(accountId: string): Promise<string> {
    const expiresIn = this.configService.get<string>('app.jwt.refreshExpiresIn', '7d');
    const expiresAt = this.calculateExpiry(expiresIn);

    const record = await this.prisma.refreshToken.create({
      data: {
        accountId,
        tokenHash: '',
        expiresAt,
      },
    });

    const token = this.jwtService.sign(
      { sub: accountId, tokenId: record.id },
      {
        secret: this.configService.get<string>('app.jwt.refreshSecret'),
        expiresIn,
      },
    );

    const tokenHash = this.hashToken(token);
    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { tokenHash },
    });

    return token;
  }

  verifyRefreshToken(rawToken: string): { accountId: string; tokenId: string } | null {
    try {
      const payload = this.jwtService.verify(rawToken, {
        secret: this.configService.get<string>('app.jwt.refreshSecret'),
      });
      if (!payload.sub || !payload.tokenId) return null;
      return { accountId: payload.sub, tokenId: payload.tokenId };
    } catch {
      return null;
    }
  }

  async validateRefreshToken(tokenId: string, rawToken: string) {
    const record = await this.prisma.refreshToken.findUnique({
      where: { id: tokenId },
    });

    if (!record || record.revokedAt) return null;
    if (record.expiresAt < new Date()) return null;

    const hash = this.hashToken(rawToken);
    if (hash !== record.tokenHash) return null;

    return record;
  }

  async revokeRefreshToken(tokenId: string): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { id: tokenId },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Atomically revoke a refresh token only if it belongs to the given account
   * and has not already been revoked.
   */
  async revokeOwnedRefreshToken(tokenId: string, accountId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { id: tokenId, accountId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllAccountTokens(accountId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { accountId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private calculateExpiry(expiresIn: string): Date {
    const now = new Date();
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) {
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];
    const ms = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit] ?? 86_400_000;

    return new Date(now.getTime() + value * ms);
  }
}
