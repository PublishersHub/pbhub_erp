import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';

interface JwtRefreshPayload {
  sub: string;
  tokenId: string;
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      secretOrKey: configService.get<string>('app.jwt.refreshSecret'),
      passReqToCallback: true,
    });
  }

  /**
   * Passes the raw refresh token string alongside the decoded payload
   * so the auth service can verify the token hash in the DB.
   */
  async validate(req: Request, payload: JwtRefreshPayload) {
    const refreshToken = req.body.refreshToken;
    return {
      userId: payload.sub,
      tokenId: payload.tokenId,
      refreshToken,
    };
  }
}
