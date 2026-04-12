import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { PerformanceCycleStatus } from '@prisma/client';

export class TransitionCycleDto {
  @ApiProperty({ enum: PerformanceCycleStatus })
  @IsEnum(PerformanceCycleStatus)
  status: PerformanceCycleStatus;
}
