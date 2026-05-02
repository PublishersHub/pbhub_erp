import { Module } from '@nestjs/common';
import { InvitationsService } from './services/invitations.service';
import { InvitationsController } from './controllers/invitations.controller';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [AuthModule, UsersModule],
  controllers: [InvitationsController],
  providers: [InvitationsService],
  exports: [InvitationsService],
})
export class InvitationsModule {}
