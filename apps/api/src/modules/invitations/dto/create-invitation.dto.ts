import {
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInvitationDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID('all', { each: true })
  roleIds: string[];

  /**
   * Optional Employee to link the new User to once the invitee accepts. Lets
   * an admin invite an existing employee to log in without manually re-linking
   * afterwards.
   */
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  employeeId?: string;
}
