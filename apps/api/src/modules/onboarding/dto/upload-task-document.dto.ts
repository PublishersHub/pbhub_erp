import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UploadTaskDocumentDto {
  @ApiProperty({ example: 'https://files.pbhub.com/onboarding/passport.pdf' })
  @IsString()
  fileUrl: string;

  @ApiProperty({ example: 'passport.pdf' })
  @IsString()
  fileName: string;
}
