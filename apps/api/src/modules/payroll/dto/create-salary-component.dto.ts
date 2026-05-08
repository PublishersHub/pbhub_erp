import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SalaryComponentType, SalaryFormulaBase } from '@prisma/client';

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

  @ApiPropertyOptional({
    enum: SalaryFormulaBase,
    default: 'FIXED',
    description: 'How the amount is derived. FIXED = literal amount typed per employee.',
  })
  @IsOptional()
  @IsEnum(SalaryFormulaBase)
  formulaBase?: SalaryFormulaBase;

  @ApiPropertyOptional({
    description: 'For percentage formulas (CTC/BASIC/GROSS), the % value (e.g. 60 for 60%).',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  formulaValue?: number;
}
