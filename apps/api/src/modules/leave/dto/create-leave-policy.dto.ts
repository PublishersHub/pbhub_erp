import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsNumber,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLeavePolicyDto {
  @ApiProperty({ example: 'Annual Leave' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'ANNUAL', description: 'Unique code per organization' })
  @IsString()
  code: string;

  @ApiPropertyOptional({ example: 'Paid annual leave for all employees' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 20, description: 'Default annual entitlement in days' })
  @IsNumber()
  @Min(0)
  annualQuotaDefault: number;

  @ApiPropertyOptional({ example: 5, default: 0, description: 'Max days that can carry forward' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  carryForwardLimit?: number;

  @ApiPropertyOptional({ example: 15, description: 'Max consecutive days per request' })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxConsecutiveDays?: number;

  @ApiPropertyOptional({ default: true, description: 'Whether half-day leave is allowed' })
  @IsOptional()
  @IsBoolean()
  allowHalfDay?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isPaid?: boolean;
}
