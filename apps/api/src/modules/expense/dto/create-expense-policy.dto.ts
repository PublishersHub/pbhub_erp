import { IsString, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateExpensePolicyDto {
  @ApiProperty({ example: 'Standard Expense Policy' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 50000, description: 'Max total claim amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxClaimAmount?: number;

  @ApiPropertyOptional({ example: 10000, description: 'Max amount per item' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxItemAmount?: number;

  @ApiPropertyOptional({ example: 500, description: 'Receipt required if item exceeds this amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  receiptRequiredAbove?: number;

  @ApiPropertyOptional({ example: 1000, description: 'Auto-approve claims below this amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  autoApproveBelow?: number;
}
