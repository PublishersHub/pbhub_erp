import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReassignTaskDto {
  @ApiProperty({ example: 'employee-uuid' })
  @IsString()
  assigneeEmployeeId: string;
}
