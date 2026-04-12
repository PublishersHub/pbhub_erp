import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CancelExpenseClaimDto {
  @ApiPropertyOptional({ example: 'Duplicate submission' })
  @IsOptional()
  @IsString()
  cancelReason?: string;
}
