import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApplicationRejectionReason } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RejectApplicationDto {
  @ApiProperty({ enum: ApplicationRejectionReason })
  @IsEnum(ApplicationRejectionReason)
  reason: ApplicationRejectionReason;

  @ApiPropertyOptional({ example: 'Lacking required experience with PostgreSQL' })
  @IsOptional()
  @IsString()
  notes?: string;
}
