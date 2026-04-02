import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/services/users.service';

interface JwtAccessPayload {
  sub: string;
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
   * Called after JWT signature is verified.
   * Loads the full user with roles and permissions from the DB
   * so that downstream guards/handlers have complete context.
   */
  async validate(payload: JwtAccessPayload) {
    const user = await this.usersService.findByIdWithPermissions(payload.sub);

    if (!user) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return user;
  }
}
