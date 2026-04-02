import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'pbhub', description: 'Organization slug for tenant resolution' })
  @IsString()
  @IsNotEmpty()
  organizationSlug: string;

  @ApiProperty({ example: 'admin@pbhub.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'admin123' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}
