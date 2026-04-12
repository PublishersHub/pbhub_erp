import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class RescindOfferDto {
  @ApiPropertyOptional({ example: 'Requisition cancelled due to budget freeze' })
  @IsOptional()
  @IsString()
  reason?: string;
}
