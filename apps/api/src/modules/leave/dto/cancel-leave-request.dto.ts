import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CancelLeaveRequestDto {
  @ApiPropertyOptional({ example: 'Plans changed' })
  @IsOptional()
  @IsString()
  cancelReason?: string;
}
