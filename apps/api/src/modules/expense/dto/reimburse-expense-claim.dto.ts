import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReimburseExpenseClaimDto {
  @ApiProperty({ example: 'payroll-uuid', description: 'Target payroll record (employee + cycle)' })
  @IsString()
  payrollId: string;
}
