import { IsString, IsDateString, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AssignLeavePolicyDto {
  @ApiProperty()
  @IsString()
  employeeId: string;

  @ApiProperty({ example: '2026-01-01' })
  @IsDateString()
  effectiveFrom: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  effectiveTo?: string;

  @ApiPropertyOptional({ example: 25, description: 'Override the policy default quota for this employee' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  customAnnualQuota?: number;
}
