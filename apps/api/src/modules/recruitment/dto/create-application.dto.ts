import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { CandidateSource } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateApplicationDto {
  @ApiProperty({ example: 'candidate-uuid' })
  @IsString()
  candidateId: string;

  @ApiProperty({ example: 'requisition-uuid' })
  @IsString()
  jobRequisitionId: string;

  @ApiPropertyOptional({ example: 'posting-uuid' })
  @IsOptional()
  @IsString()
  jobPostingId?: string;

  @ApiPropertyOptional({ enum: CandidateSource, default: CandidateSource.OTHER })
  @IsOptional()
  @IsEnum(CandidateSource)
  source?: CandidateSource;

  @ApiPropertyOptional({ example: 'employee-uuid' })
  @IsOptional()
  @IsString()
  referrerEmployeeId?: string;

  @ApiPropertyOptional({ example: 'I am excited to apply because...' })
  @IsOptional()
  @IsString()
  coverLetter?: string;

  @ApiPropertyOptional({ example: 'https://storage.example.com/resumes/application-1.pdf' })
  @IsOptional()
  @IsString()
  resumeUrl?: string;

  @ApiPropertyOptional({ example: 'my-resume.pdf' })
  @IsOptional()
  @IsString()
  resumeFileName?: string;

  @ApiPropertyOptional({ example: 110000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  expectedSalary?: number;
}
