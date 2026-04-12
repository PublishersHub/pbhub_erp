import { IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MoveStageDto {
  @ApiProperty({ example: 'stage-uuid' })
  @IsString()
  toStageId: string;

  @ApiPropertyOptional({ example: 'Strong technical screen, moving forward' })
  @IsOptional()
  @IsString()
  notes?: string;
}
