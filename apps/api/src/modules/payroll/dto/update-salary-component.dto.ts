import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SalaryFormulaBase } from '@prisma/client';

export class UpdateSalaryComponentDto {
  @ApiPropertyOptional({ example: 'Basic Salary' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Base salary component' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isTaxable?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ enum: SalaryFormulaBase })
  @IsOptional()
  @IsEnum(SalaryFormulaBase)
  formulaBase?: SalaryFormulaBase;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  formulaValue?: number;
}
