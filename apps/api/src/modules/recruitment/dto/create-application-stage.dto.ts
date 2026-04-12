import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateApplicationStageDto {
  @ApiProperty({ example: 'Phone Screen' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'phone-screen' })
  @IsString()
  slug: string;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(0)
  sortOrder: number;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  isTerminal?: boolean;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  isHired?: boolean;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  isRejected?: boolean;
}
