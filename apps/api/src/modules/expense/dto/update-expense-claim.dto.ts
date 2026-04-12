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
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

export class UpdateExpenseItemDto {
  @ApiPropertyOptional({ example: 'item-uuid', description: 'Omit for new items' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ example: 'category-uuid' })
  @IsString()
  expenseCategoryId: string;

  @ApiProperty({ example: 'Hotel in Lahore' })
  @IsString()
  description: string;

  @ApiProperty({ example: 8000 })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ example: '2026-04-02' })
  @IsDateString()
  expenseDate: string;

  @ApiPropertyOptional({ example: 'https://storage.example.com/receipts/def.pdf' })
  @IsOptional()
  @IsString()
  receiptUrl?: string;

  @ApiPropertyOptional({ example: 'hotel-receipt.pdf' })
  @IsOptional()
  @IsString()
  receiptFileName?: string;

  @ApiPropertyOptional({ example: '2-night stay' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateExpenseClaimDto {
  @ApiPropertyOptional({ example: 'Updated Travel Expenses' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'policy-uuid' })
  @IsOptional()
  @IsString()
  expensePolicyId?: string;

  @ApiPropertyOptional({ type: [UpdateExpenseItemDto], description: 'Replace all items with this list' })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UpdateExpenseItemDto)
  items?: UpdateExpenseItemDto[];
}
