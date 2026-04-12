import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateNotificationTemplateDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @IsOptional()
  subject?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  body?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
