import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RescheduleInterviewDto {
  @ApiProperty({ example: '2026-04-22T14:00:00Z' })
  @IsDateString()
  scheduledAt: string;

  @ApiPropertyOptional({ example: 90 })
  @IsOptional()
  @IsInt()
  @Min(15)
  durationMinutes?: number;

  @ApiPropertyOptional({ example: 'Room 4C' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ example: 'https://meet.example.com/new' })
  @IsOptional()
  @IsString()
  meetingUrl?: string;

  @ApiPropertyOptional({ example: 'Candidate requested a later time' })
  @IsOptional()
  @IsString()
  notes?: string;
}
