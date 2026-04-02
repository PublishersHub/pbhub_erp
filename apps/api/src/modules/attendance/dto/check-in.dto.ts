import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AttendanceLogSource } from '@prisma/client';

export class CheckInDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ enum: AttendanceLogSource, default: 'WEB' })
  @IsOptional()
  @IsEnum(AttendanceLogSource)
  source?: AttendanceLogSource;
}
