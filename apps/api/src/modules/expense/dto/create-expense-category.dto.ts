import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateExpenseCategoryDto {
  @ApiProperty({ example: 'Travel' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'TRAVEL' })
  @IsString()
  code: string;

  @ApiPropertyOptional({ example: 'Travel-related expenses' })
  @IsOptional()
  @IsString()
  description?: string;
}
