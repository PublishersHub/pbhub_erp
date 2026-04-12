import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsInt, Min, Max, IsDateString, IsOptional } from 'class-validator';

export class CreateCycleDto {
  @ApiProperty({ example: 'Q2 2026' })
  @IsString()
  name: string;

  @ApiProperty({ example: 2026 })
  @IsInt()
  @Min(2000)
  @Max(2100)
  year: number;

  @ApiProperty({ example: 2, minimum: 1, maximum: 4 })
  @IsInt()
  @Min(1)
  @Max(4)
  quarter: number;

  @ApiProperty({ example: '2026-04-01' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-06-30' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ example: '2026-04-15' })
  @IsOptional()
  @IsDateString()
  goalSettingDeadline?: string;

  @ApiPropertyOptional({ example: '2026-06-15' })
  @IsOptional()
  @IsDateString()
  selfReviewDeadline?: string;

  @ApiPropertyOptional({ example: '2026-06-25' })
  @IsOptional()
  @IsDateString()
  managerReviewDeadline?: string;
}
