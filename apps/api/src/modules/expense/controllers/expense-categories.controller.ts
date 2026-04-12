import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ExpenseCategoriesService } from '../services/expense-categories.service';
import { CreateExpenseCategoryDto } from '../dto/create-expense-category.dto';
import { UpdateExpenseCategoryDto } from '../dto/update-expense-category.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { AuthenticatedUser } from '../../../common/types';

@ApiTags('Expense Categories')
@ApiBearerAuth()
@Controller('expense-categories')
export class ExpenseCategoriesController {
  constructor(private readonly categoriesService: ExpenseCategoriesService) {}

  @Post()
  @RequirePermissions('expense.manage')
  @ApiOperation({ summary: 'Create expense category' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateExpenseCategoryDto,
  ) {
    return this.categoriesService.create(user.organizationId, dto);
  }

  @Get()
  @RequirePermissions('expense.read')
  @ApiOperation({ summary: 'List expense categories' })
  async findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.categoriesService.findAll(user.organizationId);
  }

  @Get(':id')
  @RequirePermissions('expense.read')
  @ApiOperation({ summary: 'Get expense category' })
  async findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.categoriesService.findById(user.organizationId, id);
  }

  @Patch(':id')
  @RequirePermissions('expense.manage')
  @ApiOperation({ summary: 'Update expense category' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateExpenseCategoryDto,
  ) {
    return this.categoriesService.update(user.organizationId, id, dto);
  }
}
