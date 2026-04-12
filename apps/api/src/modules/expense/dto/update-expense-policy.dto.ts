import { IsString, IsOptional, IsNumber, IsBoolean, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateExpensePolicyDto {
  @ApiPropertyOptional({ example: 'Updated Expense Policy' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 50000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxClaimAmount?: number;

  @ApiPropertyOptional({ example: 10000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxItemAmount?: number;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  receiptRequiredAbove?: number;

  @ApiPropertyOptional({ example: 1000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  autoApproveBelow?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
