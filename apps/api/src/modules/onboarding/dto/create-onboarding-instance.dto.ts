import { IsDateString, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOnboardingInstanceDto {
  @ApiProperty({ example: 'employee-uuid' })
  @IsString()
  employeeId: string;

  @ApiProperty({ example: '2026-06-01' })
  @IsDateString()
  joiningDate: string;

  @ApiPropertyOptional({
    example: 'template-uuid',
    description:
      'Optional template to use. Defaults to the organization active default template.',
  })
  @IsOptional()
  @IsString()
  templateId?: string;
}
