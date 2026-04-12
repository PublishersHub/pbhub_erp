import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CloseRequisitionDto {
  @ApiPropertyOptional({ example: 'All positions filled' })
  @IsOptional()
  @IsString()
  reason?: string;
}
