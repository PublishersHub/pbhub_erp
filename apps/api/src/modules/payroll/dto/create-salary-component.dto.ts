import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsInt,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SalaryComponentType } from '@prisma/client';

export class CreateSalaryComponentDto {
  @ApiProperty({ example: 'Basic Salary' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'BASIC', description: 'Unique code per organization' })
  @IsString()
  code: string;

  @ApiProperty({ enum: SalaryComponentType, example: 'EARNING' })
  @IsEnum(SalaryComponentType)
  type: SalaryComponentType;

  @ApiPropertyOptional({ example: 'Base salary component' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isTaxable?: boolean;

  @ApiPropertyOptional({ default: false, description: 'Auto-include for new employees' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
