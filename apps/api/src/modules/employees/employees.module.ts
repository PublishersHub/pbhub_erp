import { Module } from '@nestjs/common';
import { DepartmentsController } from './controllers/departments.controller';
import { DesignationsController } from './controllers/designations.controller';
import { EmployeesController } from './controllers/employees.controller';
import { DepartmentsService } from './services/departments.service';
import { DesignationsService } from './services/designations.service';
import { EmployeesService } from './services/employees.service';

@Module({
  controllers: [DepartmentsController, DesignationsController, EmployeesController],
  providers: [DepartmentsService, DesignationsService, EmployeesService],
  exports: [EmployeesService],
})
export class EmployeesModule {}
