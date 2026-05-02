import { IsArray, IsString, ArrayUnique } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateRolePermissionsDto {
  @ApiProperty({ type: [String], example: ['leave.read', 'leave.approve'] })
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  permissionCodes: string[];
}
