import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CancelInterviewDto {
  @ApiPropertyOptional({ example: 'Candidate withdrew' })
  @IsOptional()
  @IsString()
  reason?: string;
}
