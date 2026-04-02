import {
  IsString,
  IsEnum,
  IsOptional,
  IsInt,
  IsArray,
  IsNumber,
  Matches,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AttendancePolicyType } from '@prisma/client';

export class CreateAttendancePolicyDto {
  @ApiProperty({ example: 'Standard 9-6' })
  @IsString()
  name: string;

  @ApiProperty({ enum: AttendancePolicyType, example: 'FIXED' })
  @IsEnum(AttendancePolicyType)
  policyType: AttendancePolicyType;

  @ApiPropertyOptional({ example: '09:00', description: 'Required for FIXED policies (HH:mm)' })
  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/, { message: 'startTime must be in HH:mm format' })
  startTime?: string;

  @ApiPropertyOptional({ example: '18:00', description: 'Required for FIXED policies (HH:mm)' })
  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/, { message: 'endTime must be in HH:mm format' })
  endTime?: string;

  @ApiPropertyOptional({ example: 8.0, description: 'Required for FLEXIBLE policies' })
  @IsOptional()
  @IsNumber()
  minHoursPerDay?: number;

  @ApiPropertyOptional({ example: '10:00', description: 'Optional core hours start (HH:mm)' })
  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/, { message: 'coreStartTime must be in HH:mm format' })
  coreStartTime?: string;

  @ApiPropertyOptional({ example: '16:00', description: 'Optional core hours end (HH:mm)' })
  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/, { message: 'coreEndTime must be in HH:mm format' })
  coreEndTime?: string;

  @ApiPropertyOptional({ example: 15, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  graceMinutesLate?: number;

  @ApiPropertyOptional({ example: 15, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  graceMinutesEarly?: number;

  @ApiPropertyOptional({ example: 240, description: 'Minutes threshold for half-day status' })
  @IsOptional()
  @IsInt()
  @Min(0)
  halfDayThresholdMinutes?: number;

  @ApiPropertyOptional({
    example: [1, 2, 3, 4, 5],
    description: '0=Sun, 1=Mon, …, 6=Sat. Defaults to Mon–Fri.',
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  workingDays?: number[];
}
