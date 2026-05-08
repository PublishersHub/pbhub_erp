import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export class SetEmployeeOverrideDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  ipRestrictionExempt: boolean;

  @ApiPropertyOptional({ example: 'Remote worker — permanent WFH' })
  @IsOptional()
  @IsString()
  reason?: string;

  // ─── Schedule override (all optional) ────────────────────────────────────
  // null / unset / empty array means "fall back to the employee's policy".

  @ApiPropertyOptional({ example: '10:00', description: 'HH:mm wall-clock start' })
  @IsOptional()
  @IsString()
  @Matches(TIME_PATTERN, { message: 'scheduleStart must be HH:mm (24h)' })
  scheduleStart?: string | null;

  @ApiPropertyOptional({ example: '19:00', description: 'HH:mm wall-clock end' })
  @IsOptional()
  @IsString()
  @Matches(TIME_PATTERN, { message: 'scheduleEnd must be HH:mm (24h)' })
  scheduleEnd?: string | null;

  @ApiPropertyOptional({
    example: [2, 3, 4, 5, 6],
    description: 'Working days (0=Sun…6=Sat). Empty array means no override.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(0)
  @ArrayMaxSize(7)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  workingDays?: number[];

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(240)
  graceMinutesLate?: number | null;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(240)
  graceMinutesEarly?: number | null;
}
