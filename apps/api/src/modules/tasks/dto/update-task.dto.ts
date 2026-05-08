import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TaskPriority, TaskStatus } from '@prisma/client';

export class UpdateTaskDto {
  @ApiPropertyOptional({ example: 'Submit Q2 OKRs', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Employee.id of the assignee' })
  @IsOptional()
  @IsString()
  assigneeId?: string;

  @ApiPropertyOptional({ example: '2026-05-15' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ enum: TaskPriority })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({ enum: TaskStatus })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;
}
