import { Module } from '@nestjs/common';
import { OrganizationsService } from './services/organizations.service';

@Module({
  providers: [OrganizationsService],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
