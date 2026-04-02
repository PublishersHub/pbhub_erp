import {
  IsString,
  IsDateString,
  IsOptional,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LeaveDayType } from '@prisma/client';

export class LeaveRequestDayDto {
  @ApiProperty({ example: '2026-04-10' })
  @IsDateString()
  date: string;

  @ApiProperty({ enum: LeaveDayType, default: 'FULL_DAY' })
  @IsEnum(LeaveDayType)
  dayType: LeaveDayType;
}

export class CreateLeaveRequestDto {
  @ApiProperty({ description: 'Leave policy ID' })
  @IsString()
  leavePolicyId: string;

  @ApiProperty({ example: '2026-04-10' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-04-12' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ default: false, description: 'Quick flag for single half-day requests' })
  @IsOptional()
  @IsBoolean()
  isHalfDay?: boolean;

  @ApiPropertyOptional({ example: 'Family vacation' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({
    type: [LeaveRequestDayDto],
    description: 'Optional per-day breakdown. If omitted, all days default to FULL_DAY.',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LeaveRequestDayDto)
  days?: LeaveRequestDayDto[];
}
