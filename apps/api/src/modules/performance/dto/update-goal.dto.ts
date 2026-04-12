import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { GoalMeasurementType } from '@prisma/client';

export class UpdateGoalDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: GoalMeasurementType })
  @IsOptional()
  @IsEnum(GoalMeasurementType)
  measurementType?: GoalMeasurementType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  targetValue?: number;

  @ApiPropertyOptional({ example: 25.0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  weight?: number;
}
