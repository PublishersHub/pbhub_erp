import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { InterviewRecommendation } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitFeedbackDto {
  @ApiProperty({ example: 4, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({ enum: InterviewRecommendation })
  @IsEnum(InterviewRecommendation)
  recommendation: InterviewRecommendation;

  @ApiPropertyOptional({ example: 'Strong system design, clear communication' })
  @IsOptional()
  @IsString()
  strengths?: string;

  @ApiPropertyOptional({ example: 'Light on distributed systems experience' })
  @IsOptional()
  @IsString()
  weaknesses?: string;

  @ApiPropertyOptional({ example: 'Would hire for senior role on platform team' })
  @IsOptional()
  @IsString()
  comments?: string;
}
