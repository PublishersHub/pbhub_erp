import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ExpensePoliciesService } from '../services/expense-policies.service';
import { CreateExpensePolicyDto } from '../dto/create-expense-policy.dto';
import { UpdateExpensePolicyDto } from '../dto/update-expense-policy.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { AuthenticatedUser } from '../../../common/types';

@ApiTags('Expense Policies')
@ApiBearerAuth()
@Controller('expense-policies')
export class ExpensePoliciesController {
  constructor(private readonly policiesService: ExpensePoliciesService) {}

  @Post()
  @RequirePermissions('expense.manage')
  @ApiOperation({ summary: 'Create expense policy' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateExpensePolicyDto,
  ) {
    return this.policiesService.create(user.organizationId, dto);
  }

  @Get()
  @RequirePermissions('expense.read')
  @ApiOperation({ summary: 'List expense policies' })
  async findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.policiesService.findAll(user.organizationId);
  }

  @Get(':id')
  @RequirePermissions('expense.read')
  @ApiOperation({ summary: 'Get expense policy' })
  async findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.policiesService.findById(user.organizationId, id);
  }

  @Patch(':id')
  @RequirePermissions('expense.manage')
  @ApiOperation({ summary: 'Update expense policy' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateExpensePolicyDto,
  ) {
    return this.policiesService.update(user.organizationId, id, dto);
  }
}
