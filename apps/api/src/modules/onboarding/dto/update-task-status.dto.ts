import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OnboardingTaskStatus } from '@prisma/client';

export class UpdateTaskStatusDto {
  @ApiProperty({ enum: OnboardingTaskStatus })
  @IsEnum(OnboardingTaskStatus)
  status: OnboardingTaskStatus;

  @ApiPropertyOptional({
    example: 'Waiting on equipment delivery',
    description: 'Required when moving to BLOCKED',
  })
  @IsOptional()
  @IsString()
  blockedReason?: string;

  @ApiPropertyOptional({ example: 'Completed via online portal' })
  @IsOptional()
  @IsString()
  notes?: string;
}
