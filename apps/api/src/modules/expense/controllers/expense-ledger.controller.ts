import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import {
  ExpenseLedgerService,
  CreateLedgerEntryDto,
  UpdateLedgerEntryDto,
} from '../services/expense-ledger.service';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { AuthenticatedUser } from '../../../common/types';

@ApiTags('Expense Ledger')
@ApiBearerAuth()
@Controller('expense-ledger')
export class ExpenseLedgerController {
  constructor(private readonly service: ExpenseLedgerService) {}

  @Get()
  @RequirePermissions('expense.read')
  @ApiOperation({ summary: 'List ledger entries with running balance' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.list(user.organizationId, from, to);
  }

  @Post()
  @RequirePermissions('expense.approve')
  @ApiOperation({ summary: 'Add a ledger entry' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateLedgerEntryDto,
  ) {
    return this.service.create(user.organizationId, dto);
  }

  @Patch(':id')
  @RequirePermissions('expense.approve')
  @ApiOperation({ summary: 'Update a ledger entry' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateLedgerEntryDto,
  ) {
    return this.service.update(user.organizationId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('expense.approve')
  @ApiOperation({ summary: 'Delete a ledger entry' })
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.remove(user.organizationId, id);
  }
}
