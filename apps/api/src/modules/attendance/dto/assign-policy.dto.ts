import { IsString, IsDateString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AssignPolicyDto {
  @ApiProperty()
  @IsString()
  employeeId: string;

  @ApiProperty({ example: '2025-06-01' })
  @IsDateString()
  effectiveFrom: string;

  @ApiPropertyOptional({ example: '2025-12-31' })
  @IsOptional()
  @IsDateString()
  effectiveTo?: string;
}
