import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { CandidateSource } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCandidateDto {
  @ApiProperty({ example: 'John' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  lastName: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: '+1-555-0123' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'Acme Corp' })
  @IsOptional()
  @IsString()
  currentCompany?: string;

  @ApiPropertyOptional({ example: 'Senior Engineer' })
  @IsOptional()
  @IsString()
  currentTitle?: string;

  @ApiPropertyOptional({ example: 5.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalExperience?: number;

  @ApiPropertyOptional({ example: 'https://linkedin.com/in/johndoe' })
  @IsOptional()
  @IsString()
  linkedinUrl?: string;

  @ApiPropertyOptional({ example: 'https://johndoe.dev' })
  @IsOptional()
  @IsString()
  portfolioUrl?: string;

  @ApiPropertyOptional({ example: 'https://storage.example.com/resumes/johndoe.pdf' })
  @IsOptional()
  @IsString()
  resumeUrl?: string;

  @ApiPropertyOptional({ example: 'johndoe-resume.pdf' })
  @IsOptional()
  @IsString()
  resumeFileName?: string;

  @ApiPropertyOptional({ example: 'San Francisco, CA' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ example: 60 })
  @IsOptional()
  @IsInt()
  @Min(0)
  noticePeriodDays?: number;

  @ApiPropertyOptional({ enum: CandidateSource, default: CandidateSource.OTHER })
  @IsOptional()
  @IsEnum(CandidateSource)
  source?: CandidateSource;

  @ApiPropertyOptional({ example: 'employee-uuid' })
  @IsOptional()
  @IsString()
  referrerEmployeeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateCandidateBlacklistDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  isBlacklisted: boolean;

  @ApiPropertyOptional({ example: 'Misrepresented credentials' })
  @IsOptional()
  @IsString()
  blacklistReason?: string;
}
