import { IsArray, IsBoolean, IsEnum, IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { NotificationChannel } from '@prisma/client';

export class NotificationPreferenceItemDto {
  @IsString()
  @IsNotEmpty()
  eventType!: string;

  @IsEnum(NotificationChannel)
  channel!: NotificationChannel;

  @IsBoolean()
  enabled!: boolean;
}

export class UpdateNotificationPreferenceDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NotificationPreferenceItemDto)
  preferences!: NotificationPreferenceItemDto[];
}
