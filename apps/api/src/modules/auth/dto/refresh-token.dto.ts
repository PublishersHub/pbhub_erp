import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refreshToken: string;

  @ApiPropertyOptional({ description: 'Org to mint the new access token for. Defaults to the prior token\'s org if omitted.' })
  @IsOptional()
  @IsUUID()
  organizationId?: string;
}
