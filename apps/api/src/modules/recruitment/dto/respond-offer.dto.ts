import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum OfferResponseDecision {
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
}

export class RespondOfferDto {
  @ApiProperty({ enum: OfferResponseDecision })
  @IsEnum(OfferResponseDecision)
  decision: OfferResponseDecision;

  @ApiPropertyOptional({ example: 'Accepting competing offer' })
  @IsOptional()
  @IsString()
  declineReason?: string;
}
