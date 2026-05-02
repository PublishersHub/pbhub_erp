import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignRoleDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  roleId: string;
}
