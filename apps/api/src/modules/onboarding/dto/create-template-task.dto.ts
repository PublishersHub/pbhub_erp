import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OnboardingTaskAssigneeRole } from '@prisma/client';

export class CreateTemplateTaskDto {
  @ApiProperty({ example: 'Submit ID documents' })
  @IsString()
  title: string;

  @ApiPropertyOptional({
    example: 'Upload passport or national ID for HR verification',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    enum: OnboardingTaskAssigneeRole,
    example: OnboardingTaskAssigneeRole.NEW_HIRE,
    description:
      'Who should complete this task. CUSTOM is not valid on templates.',
  })
  @IsEnum(OnboardingTaskAssigneeRole)
  assigneeRole: OnboardingTaskAssigneeRole;

  @ApiProperty({
    example: 0,
    description:
      'Days relative to joining date. Negative = preboarding, 0 = day 1, positive = after joining.',
  })
  @IsInt()
  offsetDays: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(0)
  sortOrder: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  allowDocument?: boolean;
}
