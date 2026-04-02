import { IsString, IsNumber, IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AdjustBalanceDto {
  @ApiProperty({ description: 'Employee ID' })
  @IsString()
  employeeId: string;

  @ApiProperty({ description: 'Leave policy ID' })
  @IsString()
  leavePolicyId: string;

  @ApiProperty({ example: 2026 })
  @IsInt()
  @Min(2000)
  @Max(2100)
  year: number;

  @ApiProperty({ example: 2.5, description: 'Adjustment value (positive to add, negative to deduct)' })
  @IsNumber()
  adjustment: number;
}
