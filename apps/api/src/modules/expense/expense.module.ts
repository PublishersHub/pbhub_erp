import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ExpenseCategoriesController } from './controllers/expense-categories.controller';
import { ExpensePoliciesController } from './controllers/expense-policies.controller';
import { ExpenseClaimsController } from './controllers/expense-claims.controller';
import { ExpenseCategoriesService } from './services/expense-categories.service';
import { ExpensePoliciesService } from './services/expense-policies.service';
import { ExpenseClaimsService } from './services/expense-claims.service';
import { ExpenseReimbursementService } from './services/expense-reimbursement.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    ExpenseCategoriesController,
    ExpensePoliciesController,
    ExpenseClaimsController,
  ],
  providers: [
    ExpenseCategoriesService,
    ExpensePoliciesService,
    ExpenseClaimsService,
    ExpenseReimbursementService,
  ],
})
export class ExpenseModule {}
