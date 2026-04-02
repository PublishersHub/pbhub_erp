import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateAttendancePolicyDto } from './create-attendance-policy.dto';

export class UpdateAttendancePolicyDto extends PartialType(CreateAttendancePolicyDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
