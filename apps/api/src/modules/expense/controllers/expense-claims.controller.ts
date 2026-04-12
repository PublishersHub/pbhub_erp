import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ExpenseClaimsService } from '../services/expense-claims.service';
import { ExpenseReimbursementService } from '../services/expense-reimbursement.service';
import { CreateExpenseClaimDto } from '../dto/create-expense-claim.dto';
import { UpdateExpenseClaimDto } from '../dto/update-expense-claim.dto';
import { ReviewExpenseClaimDto } from '../dto/review-expense-claim.dto';
import { CancelExpenseClaimDto } from '../dto/cancel-expense-claim.dto';
import { ReimburseExpenseClaimDto } from '../dto/reimburse-expense-claim.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { AuthenticatedUser } from '../../../common/types';

@ApiTags('Expense Claims')
@ApiBearerAuth()
@Controller('expense-claims')
export class ExpenseClaimsController {
  constructor(
    private readonly claimsService: ExpenseClaimsService,
    private readonly reimbursementService: ExpenseReimbursementService,
  ) {}

  // ─── Employee self-service ────────────

  @Post()
  @RequirePermissions('expense.create')
  @ApiOperation({ summary: 'Create expense claim (DRAFT)' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateExpenseClaimDto,
  ) {
    return this.claimsService.create(user.userId, user.organizationId, dto);
  }

  @Get('my')
  @RequirePermissions('expense.read_own')
  @ApiOperation({ summary: 'List my expense claims' })
  @ApiQuery({ name: 'status', required: false, enum: ['DRAFT', 'SUBMITTED', 'MANAGER_APPROVED', 'FINANCE_APPROVED', 'REJECTED', 'REIMBURSED', 'CANCELLED'] })
  async findMyClaims(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: string,
  ) {
    return this.claimsService.findMyClaims(user.userId, user.organizationId, status);
  }

  @Get('my/:id')
  @RequirePermissions('expense.read_own')
  @ApiOperation({ summary: 'Get my expense claim detail' })
  async findMyClaimById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.claimsService.findMyClaimById(user.userId, user.organizationId, id);
  }

  @Patch(':id')
  @RequirePermissions('expense.create')
  @ApiOperation({ summary: 'Update draft expense claim' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateExpenseClaimDto,
  ) {
    return this.claimsService.update(user.userId, user.organizationId, id, dto);
  }

  @Patch(':id/submit')
  @RequirePermissions('expense.create')
  @ApiOperation({ summary: 'Submit expense claim (DRAFT → SUBMITTED)' })
  async submit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.claimsService.submit(user.userId, user.organizationId, id);
  }

  @Patch(':id/cancel')
  @RequirePermissions('expense.create')
  @ApiOperation({ summary: 'Cancel expense claim' })
  async cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CancelExpenseClaimDto,
  ) {
    return this.claimsService.cancel(user.userId, user.organizationId, id, dto);
  }

  // ─── Approver ─────────────────────────

  @Get('pending')
  @RequirePermissions('expense.approve')
  @ApiOperation({ summary: 'List claims pending my approval' })
  async findPendingForApprover(@CurrentUser() user: AuthenticatedUser) {
    return this.claimsService.findPendingForApprover(
      user.userId,
      user.organizationId,
      user.roles,
    );
  }

  @Patch(':id/review')
  @RequirePermissions('expense.approve')
  @ApiOperation({ summary: 'Approve or reject expense claim' })
  async review(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ReviewExpenseClaimDto,
  ) {
    return this.claimsService.review(
      user.userId,
      user.organizationId,
      id,
      dto,
      user.roles,
    );
  }

  // ─── Finance: reimburse ───────────────

  @Post(':id/reimburse')
  @RequirePermissions('expense.reimburse')
  @ApiOperation({ summary: 'Reimburse approved claim → PayrollAdjustment' })
  async reimburse(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ReimburseExpenseClaimDto,
  ) {
    return this.reimbursementService.reimburse(
      user.userId,
      user.organizationId,
      id,
      dto,
    );
  }

  // ─── Admin/HR ─────────────────────────

  @Get()
  @RequirePermissions('expense.read')
  @ApiOperation({ summary: 'List all expense claims (admin)' })
  @ApiQuery({ name: 'status', required: false, enum: ['DRAFT', 'SUBMITTED', 'MANAGER_APPROVED', 'FINANCE_APPROVED', 'REJECTED', 'REIMBURSED', 'CANCELLED'] })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: string,
  ) {
    return this.claimsService.findAll(user.organizationId, status);
  }

  @Get(':id')
  @RequirePermissions('expense.read')
  @ApiOperation({ summary: 'Get expense claim detail (admin)' })
  async findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.claimsService.findById(user.organizationId, id);
  }
}
