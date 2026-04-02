import { IsString, IsOptional, IsInt, Min, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDesignationDto {
  @ApiProperty({ example: 'Software Engineer' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 3, description: 'Seniority level (0 = lowest)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  level?: number;
}
