import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateAllowedIpRuleDto } from './create-allowed-ip-rule.dto';

export class UpdateAllowedIpRuleDto extends PartialType(CreateAllowedIpRuleDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
