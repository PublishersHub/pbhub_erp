import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './services/auth.service';
import { TokenService } from './services/token.service';
import { PasswordResetService } from './services/password-reset.service';
import { AuthController } from './controllers/auth.controller';
import { AccountController } from './controllers/account.controller';
import { JwtAccessStrategy } from './strategies/jwt-access.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({}),
    UsersModule,
  ],
  controllers: [AuthController, AccountController],
  providers: [AuthService, TokenService, PasswordResetService, JwtAccessStrategy, JwtRefreshStrategy],
  exports: [AuthService, TokenService],
})
export class AuthModule {}
