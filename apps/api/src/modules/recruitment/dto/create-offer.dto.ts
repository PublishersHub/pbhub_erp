import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { EmploymentType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOfferDto {
  @ApiProperty({ example: 'application-uuid' })
  @IsString()
  applicationId: string;

  @ApiProperty({ enum: EmploymentType })
  @IsEnum(EmploymentType)
  employmentType: EmploymentType;

  @ApiPropertyOptional({ example: 'designation-uuid' })
  @IsOptional()
  @IsString()
  designationId?: string;

  @ApiPropertyOptional({ example: 'department-uuid' })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional({ example: 'employee-uuid' })
  @IsOptional()
  @IsString()
  reportingManagerId?: string;

  @ApiProperty({ example: 110000 })
  @IsNumber()
  @Min(0)
  baseSalary: number;

  @ApiPropertyOptional({ example: 10000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  joiningBonus?: number;

  @ApiPropertyOptional({ example: 'USD', default: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ example: '2026-06-01' })
  @IsDateString()
  proposedJoiningDate: string;

  @ApiProperty({ example: '2026-05-01T23:59:59Z' })
  @IsDateString()
  expiresAt: string;

  @ApiPropertyOptional({ example: 'https://storage.example.com/offers/offer-letter.pdf' })
  @IsOptional()
  @IsString()
  offerLetterUrl?: string;

  @ApiPropertyOptional({ example: 'offer-letter.pdf' })
  @IsOptional()
  @IsString()
  offerLetterFileName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
