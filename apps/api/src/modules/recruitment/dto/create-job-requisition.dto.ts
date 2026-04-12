import {
  IsString,
  IsOptional,
  IsInt,
  IsNumber,
  IsDateString,
  IsEnum,
  Min,
} from 'class-validator';
import { EmploymentType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateJobRequisitionDto {
  @ApiProperty({ example: 'Senior Backend Engineer' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ example: 'dept-uuid' })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional({ example: 'designation-uuid' })
  @IsOptional()
  @IsString()
  designationId?: string;

  @ApiProperty({ example: 'employee-uuid' })
  @IsString()
  hiringManagerId: string;

  @ApiProperty({ enum: EmploymentType, example: EmploymentType.FULL_TIME })
  @IsEnum(EmploymentType)
  employmentType: EmploymentType;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  numberOfOpenings?: number;

  @ApiPropertyOptional({ example: 'Remote' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ example: 80000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minSalary?: number;

  @ApiPropertyOptional({ example: 120000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxSalary?: number;

  @ApiPropertyOptional({ example: 'We need an experienced backend engineer...' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '5+ years Node.js, PostgreSQL, ...' })
  @IsOptional()
  @IsString()
  requirements?: string;

  @ApiPropertyOptional({ example: '2026-06-01' })
  @IsOptional()
  @IsDateString()
  targetStartDate?: string;
}
