import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class ApproveGoalDto {
  @ApiProperty({ enum: ['APPROVED', 'REJECTED'] })
  @IsIn(['APPROVED', 'REJECTED'])
  action: 'APPROVED' | 'REJECTED';

  @ApiPropertyOptional({ example: 'Goal is too vague, please add measurable targets' })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
