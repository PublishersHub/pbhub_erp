import { PartialType } from '@nestjs/swagger';
import { CreateJobRequisitionDto } from './create-job-requisition.dto';

export class UpdateJobRequisitionDto extends PartialType(CreateJobRequisitionDto) {}
