import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum AdminMailRecipientType {
  ALL = 'all',
  DEPARTMENT = 'department',
  SPECIFIC = 'specific',
}

export class SendMailDto {
  @ApiProperty({
    enum: AdminMailRecipientType,
    description:
      'How to resolve recipients. "all" = all active employees in org; "department" = a single department; "specific" = explicit employee ids.',
  })
  @IsEnum(AdminMailRecipientType)
  recipientType: AdminMailRecipientType;

  @ApiPropertyOptional({
    description: 'Required when recipientType = "department"',
  })
  @ValidateIf((o) => o.recipientType === AdminMailRecipientType.DEPARTMENT)
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional({
    description: 'Required when recipientType = "specific"',
    type: [String],
  })
  @ValidateIf((o) => o.recipientType === AdminMailRecipientType.SPECIFIC)
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  employeeIds?: string[];

  @ApiProperty({ example: 'Office closed on Friday', maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  subject: string;

  @ApiProperty({
    description: 'Plain-text body. Will be wrapped in a branded HTML template.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(20000)
  body: string;

  @ApiPropertyOptional({ description: 'Optional preheader / preview text' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  preheader?: string;
}
