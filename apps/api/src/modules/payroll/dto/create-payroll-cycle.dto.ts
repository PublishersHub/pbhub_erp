import {
  IsInt,
  IsOptional,
  IsString,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePayrollCycleDto {
  @ApiProperty({ example: 2026 })
  @IsInt()
  @Min(2000)
  @Max(2100)
  year: number;

  @ApiProperty({ example: 4, description: 'Month (1-12)' })
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
