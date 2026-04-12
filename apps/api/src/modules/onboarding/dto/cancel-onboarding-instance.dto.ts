import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CancelOnboardingInstanceDto {
  @ApiPropertyOptional({ example: 'Candidate did not join on day 1' })
  @IsOptional()
  @IsString()
  cancelReason?: string;
}
