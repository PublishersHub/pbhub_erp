import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExpenseApprovalDecision } from '@prisma/client';

export class ReviewExpenseClaimDto {
  @ApiProperty({ enum: ExpenseApprovalDecision, example: 'APPROVED' })
  @IsEnum(ExpenseApprovalDecision)
  action: ExpenseApprovalDecision;

  @ApiPropertyOptional({ example: 'Looks good, approved.' })
  @IsOptional()
  @IsString()
  remarks?: string;
}
