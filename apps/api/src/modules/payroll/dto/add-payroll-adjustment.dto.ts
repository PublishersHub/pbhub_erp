import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PayrollAdjustmentType, PayrollAdjustmentCategory } from '@prisma/client';

export class AddPayrollAdjustmentDto {
  @ApiProperty({ enum: PayrollAdjustmentType, example: 'EARNING' })
  @IsEnum(PayrollAdjustmentType)
  type: PayrollAdjustmentType;

  @ApiPropertyOptional({ enum: PayrollAdjustmentCategory, default: 'OTHER' })
  @IsOptional()
  @IsEnum(PayrollAdjustmentCategory)
  category?: PayrollAdjustmentCategory;

  @ApiProperty({ example: 'Performance bonus for Q1' })
  @IsString()
  description: string;

  @ApiProperty({ example: 5000, description: 'Always positive; type determines +/-' })
  @IsNumber()
  @Min(0.01)
  amount: number;
}
