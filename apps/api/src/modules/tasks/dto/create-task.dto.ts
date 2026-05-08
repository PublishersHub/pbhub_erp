import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskPriority } from '@prisma/client';

export class CreateTaskDto {
  @ApiProperty({ example: 'Submit Q2 OKRs', maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ example: 'Outline goals and KRs for Q2.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Employee.id of the assignee' })
  @IsString()
  assigneeId: string;

  @ApiPropertyOptional({ example: '2026-05-15' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ enum: TaskPriority, default: TaskPriority.MEDIUM })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;
}
