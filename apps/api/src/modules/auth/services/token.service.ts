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
   */
  generateAccessToken(userId: string, organizationId: string): string {
    return this.jwtService.sign(
      { sub: userId, organizationId },
      {
        secret: this.configService.get<string>('app.jwt.accessSecret'),
        expiresIn: this.configService.get<string>('app.jwt.accessExpiresIn'),
      },
    );
  }

  /**
   * Generate a JWT refresh token (long-lived) and store its hash in the DB.
   * The raw token is returned to the client; only the hash is persisted.
   */
  async generateRefreshToken(userId: string): Promise<string> {
    const expiresIn = this.configService.get<string>('app.jwt.refreshExpiresIn', '7d');
    const expiresAt = this.calculateExpiry(expiresIn);

    // Create the DB record first to get its ID
    const record = await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: '', // placeholder, updated below
        expiresAt,
      },
    });

    // Sign JWT with the record ID so we can look it up later
    const token = this.jwtService.sign(
      { sub: userId, tokenId: record.id },
      {
        secret: this.configService.get<string>('app.jwt.refreshSecret'),
        expiresIn,
      },
    );

    // Store hash of the signed token
    const tokenHash = this.hashToken(token);
    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { tokenHash },
    });

    return token;
  }

  /**
   * Cryptographically verify a refresh token JWT and return its payload.
   * Used by logout to safely extract the tokenId without trusting unverified data.
   */
  verifyRefreshToken(rawToken: string): { userId: string; tokenId: string } | null {
    try {
      const payload = this.jwtService.verify(rawToken, {
        secret: this.configService.get<string>('app.jwt.refreshSecret'),
      });
      if (!payload.sub || !payload.tokenId) return null;
      return { userId: payload.sub, tokenId: payload.tokenId };
    } catch {
      return null;
    }
  }

  /**
   * Validate a refresh token against the DB record.
   * Checks: exists, not revoked, not expired, hash matches.
   */
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

  /**
   * Revoke a specific refresh token.
   */
  async revokeRefreshToken(tokenId: string): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { id: tokenId },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Atomically revoke a refresh token only if it belongs to the given user
   * and has not already been revoked. Uses updateMany so a non-matching
   * row is a silent no-op rather than a thrown error.
   */
  async revokeOwnedRefreshToken(tokenId: string, userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { id: tokenId, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Revoke all refresh tokens for a user (e.g., on password change).
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
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
