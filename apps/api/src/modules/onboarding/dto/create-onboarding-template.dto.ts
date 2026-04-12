import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOnboardingTemplateDto {
  @ApiProperty({ example: 'Standard Onboarding' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Default onboarding program for new hires' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
