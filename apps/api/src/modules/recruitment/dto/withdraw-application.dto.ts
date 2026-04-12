import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class WithdrawApplicationDto {
  @ApiPropertyOptional({ example: 'Candidate accepted another offer' })
  @IsOptional()
  @IsString()
  reason?: string;
}
