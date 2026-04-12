import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  IsDateString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SalaryStructureComponentDto {
  @ApiProperty({ description: 'Salary component ID' })
  @IsUUID()
  salaryComponentId: string;

  @ApiProperty({ example: 50000, description: 'Amount for this component' })
  @IsNumber()
  @Min(0)
  amount: number;
}

export class SetSalaryStructureDto {
  @ApiProperty({ description: 'Employee ID' })
  @IsUUID()
  employeeId: string;

  @ApiProperty({ example: '2026-04-01', description: 'When this structure takes effect' })
  @IsDateString()
  effectiveFrom: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [SalaryStructureComponentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SalaryStructureComponentDto)
  components: SalaryStructureComponentDto[];
}
