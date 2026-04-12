import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { NotificationChannel } from '@prisma/client';

export class CreateNotificationTemplateDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  eventType!: string;

  @IsEnum(NotificationChannel)
  @IsOptional()
  channel?: NotificationChannel;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  subject!: string;

  @IsString()
  @IsNotEmpty()
  body!: string;
}
