import { IsDateString, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class HireCandidateDto {
  @ApiProperty({
    example: 'EMP-2026-0042',
    description: 'Unique employee code for the new hire',
  })
  @IsString()
  employeeCode: string;

  @ApiProperty({ example: '2026-06-01' })
  @IsDateString()
  joiningDate: string;

  @ApiPropertyOptional({
    example: 'user-uuid',
    description: 'Optional existing user account to link to the new employee record',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ example: 'john.doe@pbhub.com' })
  @IsOptional()
  @IsString()
  workEmail?: string;
}
