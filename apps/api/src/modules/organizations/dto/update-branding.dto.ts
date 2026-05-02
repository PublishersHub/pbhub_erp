import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsHexColor, IsOptional, IsString, IsUrl, ValidateIf } from 'class-validator';

export class UpdateBrandingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  brandName?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsUrl({ require_tld: false }, { message: 'brandLogoUrl must be a valid URL' })
  brandLogoUrl?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsHexColor({ message: 'brandPrimary must be a 6-digit hex color (e.g. #7c3aed)' })
  brandPrimary?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  brandTagline?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsUrl({ require_tld: false }, { message: 'brandFaviconUrl must be a valid URL' })
  brandFaviconUrl?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsUrl({ require_tld: false }, { message: 'brandLoginBg must be a valid URL' })
  brandLoginBg?: string | null;
}
