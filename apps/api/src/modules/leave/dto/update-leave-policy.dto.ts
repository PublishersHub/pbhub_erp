import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateLeavePolicyDto } from './create-leave-policy.dto';

export class UpdateLeavePolicyDto extends PartialType(CreateLeavePolicyDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
