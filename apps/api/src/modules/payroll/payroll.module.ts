import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { SalaryComponentsController } from './controllers/salary-components.controller';
import { SalaryStructuresController } from './controllers/salary-structures.controller';
import { PayrollCyclesController } from './controllers/payroll-cycles.controller';
import { PayrollsController } from './controllers/payrolls.controller';
import { SalaryComponentsService } from './services/salary-components.service';
import { SalaryStructuresService } from './services/salary-structures.service';
import { SalaryFormulaService } from './services/salary-formula.service';
import { PayrollCyclesService } from './services/payroll-cycles.service';
import { PayrollGenerationService } from './services/payroll-generation.service';
import { PayrollsService } from './services/payrolls.service';
import { PayslipPdfService } from './services/payslip-pdf.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    SalaryComponentsController,
    SalaryStructuresController,
    PayrollCyclesController,
    PayrollsController,
  ],
  providers: [
    SalaryComponentsService,
    SalaryStructuresService,
    SalaryFormulaService,
    PayrollCyclesService,
    PayrollGenerationService,
    PayrollsService,
    PayslipPdfService,
  ],
})
export class PayrollModule {}
