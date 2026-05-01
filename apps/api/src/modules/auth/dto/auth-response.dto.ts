import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class MembershipDto {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty()
  organizationName: string;

  @ApiProperty()
  organizationSlug: string;

  @ApiProperty({ type: [String] })
  roles: string[];
}

class AccountProfileDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;
}

class ActiveUserDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty({ type: [String] })
  roles: string[];

  @ApiProperty({ type: [String] })
  permissions: string[];
}

export class AuthResponseDto {
  @ApiPropertyOptional({ description: 'Present when an org was selected (single membership or post-pick).' })
  accessToken?: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty({ type: AccountProfileDto })
  account: AccountProfileDto;

  @ApiPropertyOptional({ type: ActiveUserDto, description: 'Present when an org was selected.' })
  user?: ActiveUserDto;

  @ApiPropertyOptional({ description: 'Present when an org was selected.' })
  activeOrganizationId?: string;

  @ApiProperty({ type: [MembershipDto] })
  memberships: MembershipDto[];
}
