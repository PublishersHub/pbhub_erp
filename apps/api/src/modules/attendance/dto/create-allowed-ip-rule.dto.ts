import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAllowedIpRuleDto {
  @ApiProperty({ example: 'Main Office' })
  @IsString()
  label: string;

  @ApiProperty({ example: '203.0.113.50' })
  @IsString()
  ipAddress: string;
}
