import { IsOptional, IsString, IsEnum, IsNumber, Min, Max } from 'class-validator';
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

  // ─── Device metadata ─────────────────────
  @ApiPropertyOptional({ description: 'User-Agent string captured client-side' })
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiPropertyOptional({ description: 'Device class hint (e.g. "iPhone", "MacBook", "Android")' })
  @IsOptional()
  @IsString()
  deviceType?: string;

  // ─── Location metadata (optional, opt-in client side) ─────
  @ApiPropertyOptional({ description: 'Latitude in decimal degrees' })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({ description: 'Longitude in decimal degrees' })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({ description: 'GPS accuracy in meters' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  accuracyMeters?: number;

  @ApiPropertyOptional({ description: 'Optional human-readable label (e.g. "Office", "Karachi, Pakistan")' })
  @IsOptional()
  @IsString()
  locationLabel?: string;
}
