import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum RequisitionDecision {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export class ReviewRequisitionDto {
  @ApiProperty({ enum: RequisitionDecision })
  @IsEnum(RequisitionDecision)
  decision: RequisitionDecision;

  @ApiPropertyOptional({ example: 'Headcount not approved for Q2' })
  @IsOptional()
  @IsString()
  reason?: string;
}
