import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';

export class CalibrateReviewDto {
  @ApiProperty({ example: 4.0, description: 'Final calibrated rating (1.00–5.00)' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(5)
  finalRating: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  calibrationComment?: string;
}
