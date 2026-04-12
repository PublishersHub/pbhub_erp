import { PartialType } from '@nestjs/swagger';
import { CreateApplicationStageDto } from './create-application-stage.dto';

export class UpdateApplicationStageDto extends PartialType(CreateApplicationStageDto) {}
