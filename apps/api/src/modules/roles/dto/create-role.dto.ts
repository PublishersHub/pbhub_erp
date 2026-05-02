import { IsString, IsNotEmpty, IsOptional, MinLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRoleDto {
  @ApiProperty({ example: 'Auditor' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: 'auditor' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9_]+$/, { message: 'slug must be lowercase letters, digits, or underscores' })
  slug: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;
}
