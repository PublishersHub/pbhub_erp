import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/services/users.service';

interface JwtAccessPayload {
  sub: string;            // accountId
  userId: string;         // membership id
  organizationId: string;
}

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt-access') {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get<string>('app.jwt.accessSecret'),
      ignoreExpiration: false,
    });
  }

  /**
   * Loads the account + the per-org membership + active permissions on every
   * request. Rejects if either the account or the membership is inactive,
   * or if the org doesn't match.
   */
  async validate(payload: JwtAccessPayload) {
    const profile = await this.usersService.findActiveAuthContext(
      payload.sub,
      payload.userId,
      payload.organizationId,
    );

    if (!profile) {
      throw new UnauthorizedException('Session no longer valid');
    }

    return profile;
  }
}
