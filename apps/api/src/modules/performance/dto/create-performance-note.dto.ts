import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreatePerformanceNoteDto {
  @ApiProperty({ example: 'Strong communication this quarter; led the migration project end-to-end.' })
  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  body: string;

  @ApiPropertyOptional({
    description: 'When true, only managers/HR can read the note. When false, the subject employee can read it too.',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;
}

export class UpdatePerformanceNoteDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  body?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;
}
