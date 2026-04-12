import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { InterviewMode, InterviewType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ScheduleInterviewDto {
  @ApiProperty({ example: 'application-uuid' })
  @IsString()
  applicationId: string;

  @ApiPropertyOptional({ example: 'stage-uuid' })
  @IsOptional()
  @IsString()
  stageId?: string;

  @ApiProperty({ example: '2026-04-20T14:00:00Z' })
  @IsDateString()
  scheduledAt: string;

  @ApiPropertyOptional({ example: 60, default: 60 })
  @IsOptional()
  @IsInt()
  @Min(15)
  durationMinutes?: number;

  @ApiProperty({ enum: InterviewType })
  @IsEnum(InterviewType)
  type: InterviewType;

  @ApiPropertyOptional({ enum: InterviewMode, default: InterviewMode.VIDEO })
  @IsOptional()
  @IsEnum(InterviewMode)
  mode?: InterviewMode;

  @ApiPropertyOptional({ example: 'Room 3B' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ example: 'https://meet.example.com/xyz' })
  @IsOptional()
  @IsString()
  meetingUrl?: string;

  @ApiProperty({ type: [String], example: ['employee-uuid-1', 'employee-uuid-2'] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  panelistEmployeeIds: string[];

  @ApiPropertyOptional({ example: 'employee-uuid-1' })
  @IsOptional()
  @IsString()
  primaryPanelistEmployeeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
