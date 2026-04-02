import { PartialType } from '@nestjs/swagger';
import { CreateEmploymentDetailDto } from './create-employment-detail.dto';

export class UpdateEmploymentDetailDto extends PartialType(CreateEmploymentDetailDto) {}
