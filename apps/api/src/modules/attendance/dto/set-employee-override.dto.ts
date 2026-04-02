import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SetEmployeeOverrideDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  ipRestrictionExempt: boolean;

  @ApiPropertyOptional({ example: 'Remote worker — permanent WFH' })
  @IsOptional()
  @IsString()
  reason?: string;
}
