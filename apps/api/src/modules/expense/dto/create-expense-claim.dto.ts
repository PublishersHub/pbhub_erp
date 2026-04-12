import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsDateString,
  ValidateNested,
  ArrayMinSize,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ExpenseItemDto {
  @ApiProperty({ example: 'category-uuid' })
  @IsString()
  expenseCategoryId: string;

  @ApiProperty({ example: 'Flight to Lahore' })
  @IsString()
  description: string;

  @ApiProperty({ example: 15000 })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ example: '2026-04-01' })
  @IsDateString()
  expenseDate: string;

  @ApiPropertyOptional({ example: 'https://storage.example.com/receipts/abc.pdf' })
  @IsOptional()
  @IsString()
  receiptUrl?: string;

  @ApiPropertyOptional({ example: 'flight-receipt.pdf' })
  @IsOptional()
  @IsString()
  receiptFileName?: string;

  @ApiPropertyOptional({ example: 'Round trip' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateExpenseClaimDto {
  @ApiProperty({ example: 'April Travel Expenses' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ example: 'Business travel to Lahore office' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'policy-uuid' })
  @IsOptional()
  @IsString()
  expensePolicyId?: string;

  @ApiProperty({ type: [ExpenseItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ExpenseItemDto)
  items: ExpenseItemDto[];
}
