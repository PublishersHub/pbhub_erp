import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AdminMailController } from './admin-mail.controller';
import { AdminMailService } from './admin-mail.service';

@Module({
  imports: [PrismaModule],
  controllers: [AdminMailController],
  providers: [AdminMailService],
})
export class AdminMailModule {}
