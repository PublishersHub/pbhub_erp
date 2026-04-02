import { IsDateString, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCorrectionRequestDto {
  @ApiProperty({ example: '2025-06-15' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ example: '2025-06-15T09:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  requestedCheckIn?: string;

  @ApiPropertyOptional({ example: '2025-06-15T18:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  requestedCheckOut?: string;

  @ApiProperty({ example: 'Forgot to check in on time' })
  @IsString()
  reason: string;
}
