import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsString, Min } from 'class-validator';

export class UpdateGoalProgressDto {
  @ApiPropertyOptional({ example: 75000, description: 'New current value for NUMERIC/PERCENTAGE goals' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  value?: number;

  @ApiPropertyOptional({ example: 'Closed 3 more deals this week' })
  @IsOptional()
  @IsString()
  note?: string;
}
