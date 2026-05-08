import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SuggestionStatus } from '@prisma/client';

export class RespondSuggestionDto {
  @ApiProperty({ example: 'Thanks — we will pilot this with the engineering team.' })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  responseBody: string;

  @ApiPropertyOptional({
    enum: SuggestionStatus,
    description: 'Optional status to set alongside the response. Defaults to IN_REVIEW.',
  })
  @IsOptional()
  @IsEnum(SuggestionStatus)
  status?: SuggestionStatus;
}

export class UpdateSuggestionStatusDto {
  @ApiProperty({ enum: SuggestionStatus })
  @IsEnum(SuggestionStatus)
  status: SuggestionStatus;
}
