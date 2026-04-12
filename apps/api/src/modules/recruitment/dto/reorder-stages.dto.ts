import { IsArray, IsInt, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class StageOrderItem {
  @ApiProperty({ example: 'stage-uuid' })
  @IsString()
  stageId: string;

  @ApiProperty({ example: 3 })
  @IsInt()
  @Min(0)
  sortOrder: number;
}

export class ReorderStagesDto {
  @ApiProperty({ type: [StageOrderItem] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StageOrderItem)
  order: StageOrderItem[];
}
