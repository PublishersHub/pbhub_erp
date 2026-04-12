import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { JobPostingChannel } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateJobPostingDto {
  @ApiProperty({ example: 'requisition-uuid' })
  @IsString()
  jobRequisitionId: string;

  @ApiProperty({ example: 'Senior Backend Engineer — Platform Team' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'senior-backend-engineer-platform' })
  @IsString()
  slug: string;

  @ApiProperty({ enum: JobPostingChannel })
  @IsEnum(JobPostingChannel)
  channel: JobPostingChannel;

  @ApiProperty({ example: 'Join our platform team...' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;
}
