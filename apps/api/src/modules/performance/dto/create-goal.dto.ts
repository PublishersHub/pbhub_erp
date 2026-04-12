import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsNumber, IsUUID, Min, Max } from 'class-validator';
import { GoalMeasurementType } from '@prisma/client';

export class CreateGoalDto {
  @ApiProperty()
  @IsUUID()
  cycleId: string;

  @ApiPropertyOptional({ description: 'Target employee ID (manager creating goal for a direct report)' })
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @ApiProperty({ example: 'Increase quarterly revenue by 20%' })
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: GoalMeasurementType })
  @IsEnum(GoalMeasurementType)
  measurementType: GoalMeasurementType;

  @ApiPropertyOptional({ example: 100000, description: 'Required for NUMERIC and PERCENTAGE types' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  targetValue?: number;

  @ApiProperty({ example: 25.0, description: 'Weight as percentage (0–100)' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  weight: number;
}
