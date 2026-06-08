import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ExpenseCategoriesController } from './controllers/expense-categories.controller';
import { ExpensePoliciesController } from './controllers/expense-policies.controller';
import { ExpenseClaimsController } from './controllers/expense-claims.controller';
import { ExpenseLedgerController } from './controllers/expense-ledger.controller';
import { ExpenseCategoriesService } from './services/expense-categories.service';
import { ExpensePoliciesService } from './services/expense-policies.service';
import { ExpenseClaimsService } from './services/expense-claims.service';
import { ExpenseReimbursementService } from './services/expense-reimbursement.service';
import { ExpenseLedgerService } from './services/expense-ledger.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    ExpenseCategoriesController,
    ExpensePoliciesController,
    ExpenseClaimsController,
    ExpenseLedgerController,
  ],
  providers: [
    ExpenseCategoriesService,
    ExpensePoliciesService,
    ExpenseClaimsService,
    ExpenseReimbursementService,
    ExpenseLedgerService,
  ],
})
export class ExpenseModule {}
