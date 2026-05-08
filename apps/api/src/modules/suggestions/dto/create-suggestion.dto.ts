import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SuggestionCategory } from '@prisma/client';

export class CreateSuggestionDto {
  @ApiProperty({ example: 'Add standing desks', maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @ApiProperty({ example: 'It would be great if engineering could have standing desks.' })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  body: string;

  @ApiPropertyOptional({ enum: SuggestionCategory, default: SuggestionCategory.OTHER })
  @IsOptional()
  @IsEnum(SuggestionCategory)
  category?: SuggestionCategory;

  @ApiPropertyOptional({
    description: 'When true, authorId is stored as null and identity is hidden from admins.',
  })
  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;
}
